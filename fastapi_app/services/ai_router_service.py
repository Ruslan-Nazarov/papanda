import logging
import re
import time
from contextlib import aclosing
from typing import Dict

from fastapi_app.config import settings
from fastapi_app.services.context_builder import expected_step_keys
from fastapi_app.services.llm_provider import get_last_call_info
from fastapi_app.i18n import get_translator

logger = logging.getLogger(__name__)

# Провайдер, с которого ДОЛЖНА идти основная генерация (первый в TASK_ROUTES
# step_stream). Если фактический другой — значит упали на резерв, качество
# может просесть, и это надо показать пользователю (а не молчать).
_PRIMARY_GEN_PROVIDER = "Cerebras"
_MIN_STEP_CHARS = 120  # короче — процесс, похоже, оборвался

# Ключ шага: "1".."5" (один процесс) или "N.k" (несколько процессов на шаге,
# см. expected_step_keys/9_скелет_конспекта_промпт.md).
_STEP_MARK = re.compile(r"===\s*ШАГ\s*([1-5](?:\.\d+)?)\s*===")


def _sort_key(key: str) -> list:
    return [int(p) for p in key.split(".")]


def _base_of(key: str) -> str:
    return key.split(".")[0]


# Модель под medium-reasoning любит открывать блок называнием его роли
# («Простейшим процессом здесь выступает…», «Противоположным процессом
# является…») — вопреки запрету в 8_генератор_шага. Детерминированно срезаем
# этот зачин: он всегда в форме «<роль> процессом <связка> <предмет>».
_ROLE_OPENER_RE = re.compile(
    r"^\W*(?:простейшим|развивающим|противоположным|разрешающим|исходным)\s+процессом\s+"
    r"(?:здесь\s+|тут\s+|в\s+данном\s+случае\s+)?"
    r"(?:является|выступает|служит|становится|будет)\s+",
    re.IGNORECASE,
)


def _strip_role_opener(txt: str) -> str:
    m = _ROLE_OPENER_RE.match(txt or "")
    if not m:
        return txt
    rest = txt[m.end():].lstrip()
    return (rest[:1].upper() + rest[1:]) if rest else txt

# Потолки на длину ОТВЕТА по фазам (не размер входа).
# ВАЖНО (2026-09-07, пересмотр): раньше all_steps держали на 3400, чтобы
# вход+выход влезали в лимит Groq gpt-oss-120b (8000 токенов/мин на всё
# вместе) — это давало ~2500 символов на ВЕСЬ конспект (детский, обрубленный
# вывод). Теперь основная генерация идёт первой на Cerebras (см. TASK_ROUTES
# step_stream) — стены 8000 нет, поэтому потолки подняты под нормальный
# объём: развёрнутый переход на каждом шаге, а не 3 предложения.
_MAX_TOKENS = {
    "skeleton": 1200,
    "all_steps": 9000,
    "step": 2600,
    "step5": 3800,
    "judge": 700,
    "history": 2000,
    "editor": 6000,
}

# Многопроходный поиск простейшего процесса (см. 1_главный_промпт.md п. 6.2.1):
# столько раз пробуем целиком пересобрать конспект с другим простейшим
# процессом, если судья отклоняет предыдущую попытку. 2 (не 3): каждый ретрай
# = скелет + все шаги + судья заново, а на бесплатных лимитах это дорого.
_MAX_GENERATION_ATTEMPTS = 2

# Маршрутизация вызовов под задачу — в TASK_ROUTES (llm_provider.py). Каждый
# вызов _generate/_generate_stream ниже передаёт свой task=; скелет/справки/
# судья уходят на Gemini flash-lite (быстрый, чистый JSON), основной стрим
# шагов — на Cerebras (нет стены 8000 TPM), Groq — backstop.


class ConspectusRouter:
    def __init__(self, ai_service, context_builder, sanitizer, rag_manager):
        # We pass ai_service rather than llm_service because ai_service has the _generate method
        self.ai_service = ai_service
        self.context_builder = context_builder
        self.sanitizer = sanitizer
        self.rag_manager = rag_manager

    async def _ground(self, state: dict) -> None:
        """Одноразово подтягивает справку по теме (ru.wikipedia) в state['reference']
        для заземления фактов. Тихо ничего не делает, если темы в вики нет."""
        if state.get("reference") is not None:
            return
        try:
            ref = await self.rag_manager.reference_for(state.get("target_goal", ""))
        except Exception:  # noqa: BLE001 — fail-open
            ref = ""
        state["reference"] = ref or ""

    async def _gen_json(self, sys_prompt: str, user_msg: str, key: str, max_tokens: int) -> str:
        """Генерация JSON без строгого response_format (Groq gpt-oss часто валит его
        валидатор и уходит в медленный fallback). JSON вытаскиваем санитайзером,
        одна повторная попытка при провале."""
        for attempt in range(2):
            raw = await self.ai_service._generate(
                sys_prompt, user_msg, None, max_tokens=max_tokens, temperature=0.4,
                use_cache=False, task="step_stream",
            )
            try:
                parsed = self.sanitizer.extract_json(raw)
                value = parsed.get(key) or parsed.get(key.replace("step", "step ")) or ""
                if isinstance(value, str) and value.strip():
                    return value.strip()
                if value:
                    return str(value)
            except ValueError:
                pass
        return ""

    async def route_request(self, payload: dict) -> dict:
        action = payload.get("action")
        state = payload.get("context_state", {})
        target_step = payload.get("target_step")
        locale = payload.get("locale", "ru")

        if action == "generate_full":
            return await self._handle_auto_full(state, locale)

        elif action == "generate_step":
            return await self._handle_auto_step(state, int(target_step), locale)

        elif action == "judge":
            return await self._handle_judge(state, locale)

        else:
            return {"action_status": "error", "error_message": "Unknown action"}

    async def _handle_judge(self, state: dict, locale: str) -> dict:
        """Проверка готового конспекта судьёй по требованию (кнопка «Проверить»
        в ручном режиме / «по шагам» — там авто-судьи нет). Ничего не
        перегенерирует, только возвращает вердикт + причину."""
        steps_state = (state or {}).get("steps", {}) or {}
        collected: Dict[str, str] = {}
        for i in range(1, 6):
            s = steps_state.get(f"step{i}")
            text = (s.get("content") if isinstance(s, dict) else s) or ""
            text = text.strip()
            if len(text) >= 20:
                collected[str(i)] = text
        if len(collected) < 3:
            return {"action_status": "error", "error_message": "Конспект слишком короткий для проверки."}
        is_valid, reason = await self._judge_conspect(collected, locale)
        return {"action_status": "success", "is_valid": bool(is_valid), "reason": reason or ""}

    async def _gen_skeleton(self, state: dict, locale: str, failed_attempts: list = None) -> dict:
        """План-скелет на быстрой модели (у неё отдельный лимит частоты).
        Не критичен — при провале возвращаем {}.
        failed_attempts — прошлые попытки, отклонённые судьёй (см.
        _judge_conspect), чтобы архитектор не повторял тот же простейший
        процесс на следующей попытке."""
        prompt = await self.context_builder.build_skeleton_prompt(state, failed_attempts=failed_attempts)
        for _ in range(2):
            raw = await self.ai_service._generate(
                prompt, f"Сгенерируй скелет. Верни только JSON. Язык: {locale}",
                None, max_tokens=_MAX_TOKENS["skeleton"], temperature=0.3, fast=True,
                use_cache=False, task="skeleton",
            )
            try:
                parsed = self.sanitizer.extract_json(raw)
                if isinstance(parsed, dict):
                    return parsed
            except ValueError:
                pass
        return {}

    async def _judge_conspect(self, collected: Dict[str, str], locale: str) -> tuple:
        """Оценка судьёй: настоящее ли противоречие получилось. Если судья
        сам не смог ответить (плохой JSON) — не блокируем пользователя,
        считаем валидным (см. судья_противоречия.md: "если сомневаетесь —
        засчитывайте как валидное" — тот же принцип и для сбоя самого судьи)."""
        judge_prompt = await self.context_builder.build_judge_prompt(collected)
        raw = await self.ai_service._generate(
            judge_prompt, f"Оцени конспект. Верни только JSON. Язык: {locale}",
            None, max_tokens=_MAX_TOKENS["judge"], temperature=0.2, use_cache=False,
            task="judge",
        )
        try:
            parsed = self.sanitizer.extract_json(raw)
            is_valid = bool(parsed.get("is_valid", True))
            reason = str(parsed.get("reason", "") or "")
            return is_valid, reason
        except ValueError:
            return True, ""

    async def _generate_full_attempt(self, state: dict, locale: str, use_skeleton: bool,
                                      failed_attempts: list, report: dict = None) -> Dict[str, str]:
        """Одна полная попытка собрать все процессы всех шагов, без
        прогрессивной выдачи наружу — используется внутри цикла судьи в
        stream_generate_full. Ключи результата — "1", "2.1", "2.2", ... (см.
        expected_step_keys) в зависимости от того, сколько процессов у
        каждого шага в скелете.
        report (мутируется) — телеметрия для сигнала пользователю: кто
        обслужил основной вызов, был ли фолбэк, сколько процессов добирали."""
        report = report if report is not None else {}
        skeleton = await self._gen_skeleton(state, locale, failed_attempts=failed_attempts) if use_skeleton else {}
        # Вторая попытка заземления: сырой запрос мог быть вопросом («почему…»)
        # и не резолвиться в вики, а goal_as_process из скелета — чистая
        # именная формулировка, по ней статья находится чаще.
        if not state.get("reference") and isinstance(skeleton, dict):
            gp = (skeleton.get("goal_as_process") or "").strip()
            if gp:
                try:
                    state["reference"] = await self.rag_manager.reference_for(gp) or ""
                except Exception:  # noqa: BLE001 — fail-open
                    pass
        prompt_all = await self.context_builder.build_all_steps_prompt(
            state, skeleton, pinned_step=None, question=None,
        )
        buf = ""
        async with aclosing(self.ai_service._generate_stream(
            prompt_all, f"Сгенерируй шаги в указанном формате. Язык: {locale}",
            max_tokens=_MAX_TOKENS["all_steps"], temperature=0.5, use_cache=False,
            task="step_stream", reasoning_effort=settings.LLM_REASONING_EFFORT_GEN,
            timeout=settings.LLM_TIMEOUT_GEN,
        )) as gen:
            async for delta in gen:
                buf += delta

        info = get_last_call_info() or {}
        report["gen_provider"] = info.get("provider")
        report["gen_fell_back"] = bool(info.get("fell_back"))

        collected = self._complete_steps(buf, final=True)
        collected = {k: c for k, c in collected.items() if len(c) >= 20}

        # Добор пропущенных процессов точечно.
        regen = 0
        for key in expected_step_keys(skeleton):
            if key in collected:
                continue
            content = await self._regen_process(state, key, skeleton, locale)
            if content:
                collected[key] = content
                regen += 1
        report["regen"] = regen
        return collected

    @staticmethod
    def _complete_steps(buf: str, final: bool) -> Dict[str, str]:
        """Из накопленного буфера с маркерами ===ШАГN=== / ===ШАГN.k=== достаёт
        тексты тех процессов, которые уже полностью получены (есть следующий
        маркер, либо поток завершён)."""
        marks = list(_STEP_MARK.finditer(buf))
        out: Dict[str, str] = {}
        for i, m in enumerate(marks):
            key = m.group(1)
            start = m.end()
            if i + 1 < len(marks):
                end, done = marks[i + 1].start(), True
            else:
                end, done = len(buf), final
            if done:
                text = buf[start:end].strip().strip("`").strip()
                if text:
                    out[key] = text
        return out

    async def stream_generate_full(self, state: dict, locale: str, use_skeleton: bool = False,
                                   pinned_step: int = None, question: str = None):
        """Генератор (step_key, content) плюс служебные события ("__status__", текст)
        для UI-индикатора долгих операций.
        pinned_step + question (кнопка ❓ «перегенерировать с уточнением»):
        сначала сам зафиксированный шаг ПЕРЕПИСЫВАЕТСЯ с учётом уточнения
        (а не остаётся как есть), и только после этого остальные шаги
        перегенерируются согласованно с его ОБНОВЛЁННЫМ текстом. Для этого
        пути судья НЕ используется — это точечная правка, не поиск простейшего
        процесса заново.
        Без pinned_step — обычная полная генерация: до _MAX_GENERATION_ATTEMPTS
        попыток, судья (см. _judge_conspect) проверяет каждую попытку целиком;
        при отклонении — новая попытка с ДРУГИМ простейшим процессом, прошлые
        отклонённые попытки передаются архитектору, чтобы не повторялись
        (1_главный_промпт.md п. 6.2.1)."""
        if "steps" not in state:
            state["steps"] = {}

        await self._ground(state)

        try:
            pinned = int(pinned_step) if pinned_step else None
        except (TypeError, ValueError):
            pinned = None

        if pinned:
            async for event in self._stream_pinned_regeneration(state, locale, pinned, question):
                yield event
            return

        _ = get_translator(locale)
        t0 = time.time()
        report: Dict = {"attempts": 0, "regen": 0, "judge": "skipped",
                        "gen_provider": None, "gen_fell_back": False}
        failed_attempts = []
        collected: Dict[str, str] = {}
        for attempt in range(1, _MAX_GENERATION_ATTEMPTS + 1):
            report["attempts"] = attempt
            if attempt > 1:
                yield ("__status__", _("gen_status_retry").format(n=attempt, total=_MAX_GENERATION_ATTEMPTS))
            elif use_skeleton:
                yield ("__status__", _("gen_status_planning"))

            collected = await self._generate_full_attempt(
                state, locale, use_skeleton or attempt > 1, failed_attempts, report)
            if not collected:
                continue

            yield ("__status__", _("gen_status_judging"))
            is_valid, reason = await self._judge_conspect(collected, locale)
            report["judge"] = "passed" if is_valid else "failed"
            if is_valid or attempt == _MAX_GENERATION_ATTEMPTS:
                break
            step1_summary = " / ".join(c for k, c in collected.items() if _base_of(k) == "1")[:200]
            failed_attempts.append({"thesis1": step1_summary, "reason": reason})

        collected = {k: _strip_role_opener(v) for k, v in collected.items()}
        for key in sorted(collected.keys(), key=_sort_key):
            content = collected.get(key)
            if content:
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)

        # Редакторский проход: сшить блоки в одно связное объяснение, снять
        # жаргон и повторы. Меняет только те блоки, где реально помогло.
        if len(collected) >= 3:
            yield ("__status__", _("gen_status_editor"))
            for key, edited in (await self._gen_editor(state, collected, locale)).items():
                collected[key] = edited
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": edited, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, edited)

        # Доп. проход: заголовки-суть по шагам + исторические справки (📜) +
        # имя конспекта и итоговый вывод для блока-якоря.
        if collected:
            yield ("__status__", _("gen_status_postprocess"))
            notes, titles, meta = await self._gen_postprocess(state, collected, locale)
            if titles:
                state["step_titles"] = titles
                yield ("__titles__", titles)
            if notes:
                state.setdefault("history_notes", {}).update(notes)
                yield ("__history_notes__", notes)
            if meta:
                state["note_meta"] = meta
                yield ("__note_meta__", meta)

        # Отчёт о качестве прогона: отличить «просели токены/провайдер» от
        # «плохо сработал метод» — и сказать это пользователю, а не молчать.
        short_steps = sum(1 for v in collected.values() if len(v) < _MIN_STEP_CHARS)
        expected_min = 6  # 1 + 2 развивающих + 3 + 4 + 5
        report["expected_blocks"] = expected_min
        report["got_blocks"] = len(collected)
        report["short_blocks"] = short_steps
        report["duration_s"] = round(time.time() - t0, 1)

        degraded_reasons = []
        if report.get("gen_provider") and report["gen_provider"] != _PRIMARY_GEN_PROVIDER:
            degraded_reasons.append("fallback_provider")
        if report["attempts"] >= _MAX_GENERATION_ATTEMPTS and report["judge"] == "failed":
            degraded_reasons.append("judge_gave_up")
        if len(collected) < expected_min:
            degraded_reasons.append("missing_blocks")
        if short_steps:
            degraded_reasons.append("truncated_blocks")
        if report["regen"] >= 3:
            degraded_reasons.append("many_regens")
        report["degraded"] = bool(degraded_reasons)
        report["reasons"] = degraded_reasons

        logger.info(
            "conspect gen: provider=%s fell_back=%s attempts=%d judge=%s regen=%d "
            "blocks=%d/%d short=%d dur=%.1fs degraded=%s%s",
            report.get("gen_provider"), report.get("gen_fell_back"), report["attempts"],
            report["judge"], report["regen"], report["got_blocks"], expected_min,
            short_steps, report["duration_s"], report["degraded"],
            (" reasons=" + ",".join(degraded_reasons)) if degraded_reasons else "",
        )
        yield ("__report__", report)

    async def _gen_editor(self, state: dict, collected: Dict[str, str], locale: str) -> Dict[str, str]:
        """Редакторский проход поверх готовых Шагов 1–5 (см.
        редактор_конспекта_промпт.md): сшивает блоки в одно связное объяснение,
        убирает жаргон алгоритма и повторы. Возвращает {ключ: новый текст}
        ТОЛЬКО для реально изменённых блоков, прошедших проверку на
        вменяемость (не пустой, длина не схлопнута и не раздута). Плохой
        JSON / ошибка → {} (оставляем оригинал — проход необязательный)."""
        if len(collected) < 3:
            return {}
        prompt = await self.context_builder.build_editor_prompt(state, collected)
        raw = await self.ai_service._generate(
            prompt, f"Отредактируй конспект. Верни только JSON. Язык: {locale}",
            {"type": "json_object"}, max_tokens=_MAX_TOKENS["editor"], temperature=0.3,
            use_cache=False, task="editor",
        )
        raw = (raw or "").strip()
        if not raw or raw.startswith(("Error calling AI:", "AI disabled")):
            return {}
        try:
            parsed = self.sanitizer.extract_json(raw)
        except ValueError:
            return {}
        if not isinstance(parsed, dict):
            return {}
        out: Dict[str, str] = {}
        for key, original in collected.items():
            edited = parsed.get(key)
            if not isinstance(edited, str):
                continue
            edited = edited.strip()
            orig = original.strip()
            if len(edited) < 40 or not (0.7 * len(orig) <= len(edited) <= 1.35 * len(orig)):
                continue
            if edited != orig:
                out[key] = edited
        return out

    async def _gen_postprocess(self, state: dict, collected: Dict[str, str], locale: str):
        """Один проход поверх готовых Шагов 1–5: (notes, titles, meta).
        titles — короткий заголовок-суть на каждый ключ шага ("1","2.1",...),
        для схемы-сворачивания. notes — исторические справки только по тем
        базовым шагам, где нужно (расхождение логики с историей / деталь).
        meta — {note_title, anchor_title, anchor_summary}: имя конспекта и
        итоговый вывод для блока-якоря («Теперь вы поняли»)."""
        prompt = await self.context_builder.build_history_notes_prompt(state, collected)
        raw = await self.ai_service._generate(
            prompt, f"Верни JSON {{titles, notes, note_title, anchor_title, anchor_summary}}. Язык: {locale}",
            {"type": "json_object"}, max_tokens=_MAX_TOKENS["history"], temperature=0.4,
            use_cache=False, fast=True, task="history",
        )
        raw = (raw or "").strip()
        if not raw or raw.startswith(("Error calling AI:", "AI disabled")):
            return {}, {}, {}
        try:
            parsed = self.sanitizer.extract_json(raw)
        except ValueError:
            return {}, {}, {}
        parsed = parsed or {}

        def _norm_key(k):
            k = re.sub(r"[^\d.]", "", str(k))
            return k if re.fullmatch(r"[1-5](\.\d+)?", k or "") else None

        titles: Dict[str, str] = {}
        for k, v in (parsed.get("titles") or {}).items():
            nk = _norm_key(k)
            if nk and isinstance(v, str) and v.strip():
                titles[nk] = v.strip()

        notes: Dict[str, str] = {}
        for k, v in (parsed.get("notes") or {}).items():
            nk = _norm_key(k)
            if nk and isinstance(v, str) and v.strip():
                notes[nk.split(".")[0]] = v.strip()

        meta: Dict[str, str] = {}
        for fld in ("note_title", "anchor_title", "anchor_summary"):
            v = parsed.get(fld)
            if isinstance(v, str) and v.strip():
                meta[fld] = v.strip()
        return notes, titles, meta

    async def _stream_pinned_regeneration(self, state: dict, locale: str, pinned: int,
                                          question: str):
        """Часть stream_generate_full для кнопки ❓ — вынесено отдельно, без судьи."""
        _ = get_translator(locale)
        if question:
            updated_pinned = await self._regen_step(state, pinned, "", locale, question=question)
            if updated_pinned:
                state["steps"][f"step{pinned}"] = {
                    "content": updated_pinned, "status": "ready", "author": "ai", "sub_steps": [],
                }
                yield (f"step{pinned}", updated_pinned)
            # Если перегенерация зафиксированного шага не удалась — продолжаем
            # со старым его текстом, чем прерывать весь запрос пользователя.

        prompt_all = await self.context_builder.build_all_steps_prompt(
            state, {}, pinned_step=pinned, question=None,
        )

        buf, emitted = "", {}
        pinned_str = str(pinned)
        async with aclosing(self.ai_service._generate_stream(
            prompt_all, f"Сгенерируй шаги в указанном формате. Язык: {locale}",
            max_tokens=_MAX_TOKENS["all_steps"], temperature=0.5, use_cache=False,
            task="step_stream", reasoning_effort=settings.LLM_REASONING_EFFORT_GEN,
            timeout=settings.LLM_TIMEOUT_GEN,
        )) as gen:
            async for delta in gen:
                buf += delta
                for key, content in self._complete_steps(buf, final=False).items():
                    if _base_of(key) == pinned_str:
                        continue
                    if len(content) >= 20 and emitted.get(key) != content:
                        emitted[key] = content
                        step_key = f"step{key}"
                        state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                        yield (step_key, content)

        # Хвост потока — финализируем последний процесс.
        for key, content in self._complete_steps(buf, final=True).items():
            if _base_of(key) == pinned_str:
                continue
            if len(content) >= 20 and emitted.get(key) != content:
                emitted[key] = content
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)

        # Добор пропущенных шагов (обычно 0). Путь без судьи -> всегда по одному
        # процессу на шаг (см. ограничение специфики в build_all_steps_prompt).
        for i in range(1, 6):
            key = str(i)
            if key == pinned_str or emitted.get(key):
                continue
            content = await self._regen_step(state, i, "", locale)
            if content:
                emitted[key] = content
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)

        # Шаги изменились — пересобираем заголовки и исторические справки.
        base_steps = {str(i): (state["steps"].get(f"step{i}", {}) or {}).get("content", "").strip()
                      for i in range(1, 6)}
        base_steps = {k: v for k, v in base_steps.items() if len(v) >= 20}
        if len(base_steps) >= 3:
            yield ("__status__", _("gen_status_postprocess_upd"))
            notes, titles, meta = await self._gen_postprocess(state, base_steps, locale)
            if titles:
                state["step_titles"] = titles
                yield ("__titles__", titles)
            # Пустой notes тоже шлём — фронт снимет устаревшие значки.
            state["history_notes"] = notes
            yield ("__history_notes__", notes)
            if meta:
                state["note_meta"] = meta
                yield ("__note_meta__", meta)

    async def _handle_auto_full(self, state: dict, locale: str) -> dict:
        """Нестримовый путь: собирает результат stream_generate_full целиком.
        Фронт обычно идёт через SSE; этот путь — для `action=generate_full`
        нестримового эндпоинта `/conspectus/route`."""
        updated_steps = {}
        history_notes, step_titles, note_meta, report = {}, {}, {}, {}
        async for step_key, content in self.stream_generate_full(state, locale, use_skeleton=True):
            if step_key == "__status__":
                continue
            if step_key == "__history_notes__":
                history_notes = content or {}
                continue
            if step_key == "__titles__":
                step_titles = content or {}
                continue
            if step_key == "__note_meta__":
                note_meta = content or {}
                continue
            if step_key == "__report__":
                report = content or {}
                continue
            updated_steps[step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}

        if not any(s["content"] for s in updated_steps.values()):
            return {"action_status": "error", "error_message": "Модель не вернула шаги."}
        return {"action_status": "success", "updated_steps": updated_steps,
                "history_notes": history_notes, "step_titles": step_titles,
                "note_meta": note_meta, "report": report, "cascading_events": []}

    async def _regen_step(self, state: dict, step_idx: int, thesis: str, locale: str,
                           question: str = None, skeleton: dict = None) -> str:
        prompt = await self.context_builder.build_step_prompt(
            state, step_idx, question=question, skeleton=skeleton or None,
        )
        if thesis:
            prompt += f"\nРЕКОМЕНДУЕМЫЙ ТЕЗИС ОТ АРХИТЕКТОРА: {thesis}\n"
        max_tokens = _MAX_TOKENS["step5"] if step_idx == 5 else _MAX_TOKENS["step"]
        return await self._gen_json(
            prompt, f"Генерируй шаг {step_idx}. Язык: {locale}", f"step{step_idx}", max_tokens
        )

    async def _regen_process(self, state: dict, key: str, skeleton: dict, locale: str) -> str:
        """Добор одного пропущенного процесса по ключу ("1", "2.2", ...) —
        для бесшовных (без точки) ключей просто зовёт _regen_step, для
        составных использует build_process_prompt (несколько процессов на шаге)."""
        base = int(_base_of(key))
        if "." not in key:
            plan = skeleton.get(f"step{base}", {})
            thesis = plan.get("thesis", "") if isinstance(plan, dict) else ""
            return await self._regen_step(state, base, thesis, locale, skeleton=skeleton)

        prompt = await self.context_builder.build_process_prompt(state, key, skeleton)
        max_tokens = _MAX_TOKENS["step5"] if base == 5 else _MAX_TOKENS["step"]
        return await self._gen_json(
            prompt, f"Генерируй процесс. Язык: {locale}", "process", max_tokens
        )

    async def _handle_auto_step(self, state: dict, target_step: int, locale: str) -> dict:
        await self._ground(state)
        # 1. Инвалидация последующих шагов при перегенерации раннего шага
        cascading_events = self._invalidate_subsequent_steps(state, target_step)

        max_tokens = _MAX_TOKENS["step5"] if target_step == 5 else _MAX_TOKENS["step"]

        # 2. Шаги 1 и 2 могут состоять из нескольких процессов (как в полной
        # генерации). Пробуем скелет; если для этого шага в нём >1 процесса —
        # каждый идёт отдельным блоком stepN.k.
        skeleton: dict = {}
        step_keys = [str(target_step)]
        if target_step in (1, 2):
            skeleton = await self._gen_skeleton(state, locale)
            planned = [k for k in expected_step_keys(skeleton) if _base_of(k) == str(target_step)]
            if len(planned) > 1:
                step_keys = planned

        updated_steps: dict = {}
        if len(step_keys) == 1 and "." not in step_keys[0]:
            # Прежний путь — один блок на шаг.
            prompt = await self.context_builder.build_step_prompt(
                state, target_step, skeleton=skeleton or None,
            )
            content = await self._gen_json(
                prompt, f"Генерируй шаг {target_step}. Язык: {locale}", f"step{target_step}", max_tokens
            )
            if not content:
                return {"action_status": "error", "error_message": "Не удалось сгенерировать шаг (пустой ответ модели)."}
            updated_steps[f"step{target_step}"] = {
                "content": self.sanitizer.clean_markdown_for_editor(content),
                "status": "draft", "author": "ai",
            }
        else:
            # Несколько процессов — по блоку на каждый (stepN.k).
            for key in step_keys:
                content = await self._regen_process(state, key, skeleton, locale)
                if content:
                    updated_steps[f"step{key}"] = {
                        "content": self.sanitizer.clean_markdown_for_editor(content),
                        "status": "draft", "author": "ai",
                    }
            if not updated_steps:
                return {"action_status": "error", "error_message": "Не удалось сгенерировать шаг (пустой ответ модели)."}

        # 3. Принудительная очистка зависимых шагов в интерфейсе
        for event in cascading_events:
            step_to_clear = event.replace("invalidated_", "")
            updated_steps[step_to_clear] = {
                "content": "",
                "status": "invalidated",
                "author": None
            }

        return {
            "action_status": "success",
            "updated_steps": updated_steps,
            "cascading_events": cascading_events
        }

    def _invalidate_subsequent_steps(self, state: dict, current_step: int) -> list:
        # Если изменен шаг N, то шаги от N+1 до 5 помечаются недействительными
        events = []
        for i in range(current_step + 1, 6):
            step_key = f"step{i}"
            if state.get("steps", {}).get(step_key, {}).get("status") not in ["empty", "invalidated"]:
                events.append(f"invalidated_{step_key}")
        return events
