"""Конвейер ИИ-генерации диалектического конспекта.

Один класс `GenerationPipeline` ведёт весь путь: заземление (вики) → скелет-
план → потоковая генерация всех шагов → судья → редакторский проход →
постпроцесс (заголовки-суть, исторические справки, имя конспекта, вывод для
якоря) → отчёт о качестве прогона. Маршрутизацию запросов и пошаговые
операции держит `ai_router_service.ConspectusRouter` поверх этого.
"""
import logging
import re
import time
from typing import Dict

from fastapi_app.config import settings
from fastapi_app.services.context_builder import expected_step_keys
from fastapi_app.services.llm_provider import get_last_call_info
from fastapi_app.i18n import get_translator

logger = logging.getLogger(__name__)

# Провайдер, с которого ДОЛЖНА идти основная генерация (первый в TASK_ROUTES
# step_stream). Если фактический другой — значит упали на резерв, качество
# может просесть, и это надо показать пользователю (а не молчать).
_PRIMARY_GEN_PROVIDER = "GigaChat"
_MIN_STEP_CHARS = 120  # короче — процесс, похоже, оборвался

# Ключ шага: "1".."5" (один процесс) или "N.k" (несколько процессов на шаге,
# см. expected_step_keys/9_скелет_конспекта_промпт.md).
_STEP_MARK = re.compile(r"===\s*ШАГ\s*([1-5](?:\.\d+)?)\s*===")


def _sort_key(key: str) -> list:
    return [int(p) for p in key.split(".")]


def _base_of(key: str) -> str:
    return key.split(".")[0]


# gpt-oss-120b на Cerebras иногда роняет обратный слэш в LaTeX-командах, и
# управляющий символ (\r \f \t \b \a \v) уходит в текст как есть: \rho → CR+ho,
# \frac → FF+rac, \to → TAB+o, \bullet → BS+ullet. В нашем выводе этих символов
# быть не может (ни таблиц, ни переводов страниц), поэтому чиним 1:1 — символ
# обратно в \r/\f/… , и команда LaTeX восстанавливается.
_CTRL_TO_BACKSLASH = {"\r": "\\r", "\f": "\\f", "\t": "\\t", "\x08": "\\b", "\x07": "\\a", "\x0b": "\\v"}
# \n (0x0A) не трогаем как символ (это настоящие переводы строк), но чиним
# конкретные команды, где перед латинским хвостом стоит перенос.
_NL_LATEX_RE = re.compile(r"\n(?=(?:abla|eq|otin|u|leq|geq|i|ni|par)\b)")
# gpt-oss иногда пишет прямо неверную команду вместо \cdot — чиним отдельно.
_LATEX_TYPOS = ((r"\bdots", r"\cdots"), (r"\bdot", r"\cdot"))


def _fix_math(txt: str) -> str:
    if not txt:
        return txt
    for ctrl, rep in _CTRL_TO_BACKSLASH.items():
        if ctrl in txt:
            txt = txt.replace(ctrl, rep)
    txt = _NL_LATEX_RE.sub(r"\\n", txt)
    for bad, good in _LATEX_TYPOS:
        if bad in txt:
            txt = txt.replace(bad, good)
    return txt


# Потолки на длину ОТВЕТА по фазам (не размер входа).
# ВАЖНО (2026-09-07, пересмотр): раньше all_steps держали на 3400, чтобы
# вход+выход влезали в лимит Groq gpt-oss-120b (8000 токенов/мин на всё
# вместе) — это давало ~2500 символов на ВЕСЬ конспект (детский, обрубленный
# вывод). Теперь основная генерация идёт первой на Cerebras (см. TASK_ROUTES
# step_stream) — стены 8000 нет, поэтому потолки подняты под нормальный
# объём: развёрнутый переход на каждом шаге, а не 3 предложения.
_MAX_TOKENS = {
    # 1200 хватало на голые тезисы; поля вывода (что свёрнуто/что развёрнуто/
    # обратный ход/чем обходится/в чём несовместимость/что снимает — см.
    # аудит 2026-09-12, пункт А) занимают заметно больше места.
    "skeleton": 2600,
    # all_steps: до 4 развивающих процессов на Шаге 2 + вывод/доказательство
    # на каждом шаге (9_скелет + 8_генератор «показывай, а не рассказывай»)
    # — конспект стал длиннее; Cerebras стены 8000 не имеет.
    "all_steps": 13000,
    "step": 2600,
    "step5": 3800,
    # 700 хватало на low; medium-reasoning тратит часть бюджета на сами
    # рассуждения до JSON-ответа — подняли, чтобы вывод не обрезался.
    "judge": 1000,
    "history": 2000,
}



# Многопроходный поиск простейшего процесса (см. 1_главный_промпт.md п. 6.2.1):
# столько раз пробуем целиком пересобрать конспект с другим простейшим
# процессом, если судья отклоняет предыдущую попытку. 2 (не 3): каждый ретрай
# = скелет + все шаги + судья заново, а на бесплатных лимитах это дорого.
_MAX_GENERATION_ATTEMPTS = 2


class GenerationPipeline:
    def __init__(self, ai_service, context_builder, sanitizer, rag_manager):
        self.ai_service = ai_service
        self.context_builder = context_builder
        self.sanitizer = sanitizer
        self.rag_manager = rag_manager

    # ------------------------------------------------------------------ #
    #  Публичные помощники (нужны роутеру для пошаговых операций)          #
    # ------------------------------------------------------------------ #

    async def ground(self, state: dict) -> None:
        """Одноразово подтягивает справку по теме (ru.wikipedia) в state['reference']
        для заземления фактов. Тихо ничего не делает, если темы в вики нет."""
        if state.get("reference") is not None:
            return
        try:
            ref = await self.rag_manager.reference_for(state.get("target_goal", ""))
        except Exception:  # noqa: BLE001 — fail-open
            ref = ""
        state["reference"] = ref or ""

    async def gen_json(self, sys_prompt: str, user_msg: str, key: str, max_tokens: int) -> str:
        """Генерация JSON без строгого response_format (Groq gpt-oss часто валит его
        валидатор и уходит в медленный fallback). JSON вытаскиваем санитайзером,
        одна повторная попытка при провале."""
        for _attempt in range(2):
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

    async def gen_skeleton(self, state: dict, locale: str, failed_attempts: list = None) -> dict:
        """План-скелет на быстрой модели (у неё отдельный лимит частоты).
        Не критичен — при провале возвращаем {}.
        failed_attempts — прошлые попытки, отклонённые судьёй (см.
        judge_conspect), чтобы архитектор не повторял тот же простейший
        процесс на следующей попытке."""
        prompt = await self.context_builder.build_skeleton_prompt(state, failed_attempts=failed_attempts)
        for _ in range(2):
            raw = await self.ai_service._generate(
                prompt, f"Сгенерируй скелет. Верни только JSON. Язык: {locale}",
                None, max_tokens=_MAX_TOKENS["skeleton"], temperature=0.3, fast=False,
                use_cache=False, task="skeleton",
                reasoning_effort=settings.LLM_REASONING_EFFORT_SKELETON,
            )
            try:
                parsed = self.sanitizer.extract_json(raw)
                if isinstance(parsed, dict):
                    return parsed
            except ValueError:
                pass
        return {}

    async def judge_conspect(self, collected: Dict[str, str], locale: str) -> tuple:
        """Оценка судьёй: настоящее ли противоречие получилось. Если судья
        сам не смог ответить (плохой JSON) — не блокируем пользователя,
        считаем валидным (см. судья_противоречия.md: "если сомневаетесь —
        засчитывайте как валидное" — тот же принцип и для сбоя самого судьи).

        Возвращает (is_valid, reason, bad_steps). bad_steps — опциональный
        список номеров шагов ("1".."5"), которые судья указал как разрушающие
        переход (поле `bad_transitions` в ответе судьи, если промпт его
        просит — см. аудит 2026-09-12, пункт Ж). Если поля нет или судья на
        старом формате ответа — bad_steps пуст, и вызывающий код падает
        обратно на полный пересбор конспекта (старое поведение)."""
        judge_prompt = await self.context_builder.build_judge_prompt(collected)
        raw = await self.ai_service._generate(
            judge_prompt, f"Оцени конспект. Верни только JSON. Язык: {locale}",
            None, max_tokens=_MAX_TOKENS["judge"], temperature=0.2, use_cache=False,
            task="judge", reasoning_effort=settings.LLM_REASONING_EFFORT_JUDGE,
        )
        try:
            parsed = self.sanitizer.extract_json(raw)
            is_valid = bool(parsed.get("is_valid", True))
            reason = str(parsed.get("reason", "") or "")
            bad_raw = parsed.get("bad_transitions") or []
            bad_steps = sorted({
                str(b).strip() for b in bad_raw
                if str(b).strip() in {"1", "2", "3", "4", "5"}
            }) if isinstance(bad_raw, list) else []
            return is_valid, reason, bad_steps
        except ValueError:
            return True, "", []

    async def regen_step(self, state: dict, step_idx: int, thesis: str, locale: str,
                         question: str = None, skeleton: dict = None) -> str:
        prompt = await self.context_builder.build_step_prompt(
            state, step_idx, question=question, skeleton=skeleton or None,
        )
        if thesis:
            prompt += f"\nРЕКОМЕНДУЕМЫЙ ТЕЗИС ОТ АРХИТЕКТОРА: {thesis}\n"
        max_tokens = _MAX_TOKENS["step5"] if step_idx == 5 else _MAX_TOKENS["step"]
        return await self.gen_json(
            prompt, f"Генерируй шаг {step_idx}. Язык: {locale}", f"step{step_idx}", max_tokens
        )

    async def regen_process(self, state: dict, key: str, skeleton: dict, locale: str) -> str:
        """Добор одного пропущенного процесса по ключу ("1", "2.2", ...) —
        для бесшовных (без точки) ключей просто зовёт regen_step, для
        составных использует build_process_prompt (несколько процессов на шаге)."""
        base = int(_base_of(key))
        if "." not in key:
            plan = skeleton.get(f"step{base}", {})
            thesis = plan.get("thesis", "") if isinstance(plan, dict) else ""
            return await self.regen_step(state, base, thesis, locale, skeleton=skeleton)

        prompt = await self.context_builder.build_process_prompt(state, key, skeleton)
        max_tokens = _MAX_TOKENS["step5"] if base == 5 else _MAX_TOKENS["step"]
        return await self.gen_json(
            prompt, f"Генерируй процесс. Язык: {locale}", "process", max_tokens
        )

    # ------------------------------------------------------------------ #
    #  Полная генерация                                                   #
    # ------------------------------------------------------------------ #

    async def _generate_full_attempt(self, state: dict, locale: str, use_skeleton: bool,
                                     failed_attempts: list, report: dict = None) -> tuple:
        """Одна полная попытка собрать все процессы всех шагов, без
        прогрессивной выдачи наружу — используется внутри цикла судьи в
        stream_generate_full. Возвращает (collected, skeleton): collected —
        "1", "2.1", "2.2", ... (см. expected_step_keys) в зависимости от
        того, сколько процессов у каждого шага в скелете; skeleton нужен
        вызывающему коду для точечного ретрая по ключам судьи (bad_transitions),
        без пересборки плана заново (см. judge_conspect).
        report (мутируется) — телеметрия для сигнала пользователю: кто
        обслужил основной вызов, был ли фолбэк, сколько процессов добирали."""
        report = report if report is not None else {}
        skeleton = await self.gen_skeleton(state, locale, failed_attempts=failed_attempts) if use_skeleton else {}
        # Вторая попытка заземления: сырой запрос мог быть вопросом («почему…»)
        # и не резолвиться в вики. Пробуем по порядку более «статейные»
        # формулировки: цель-как-процесс, потом название простейшего процесса
        # (часто это чистое понятие — «хлорофилл», «рассеяние Рэлея»).
        if not state.get("reference") and isinstance(skeleton, dict):
            step1 = skeleton.get("step1", {})
            candidates = [
                (skeleton.get("goal_as_process") or "").strip(),
                (step1.get("thesis", "") if isinstance(step1, dict) else "").strip(),
            ]
            for term in candidates:
                if not term:
                    continue
                try:
                    ref = await self.rag_manager.reference_for(term)
                except Exception:  # noqa: BLE001 — fail-open
                    ref = ""
                if ref:
                    state["reference"] = ref
                    break
        prompt_all = await self.context_builder.build_all_steps_prompt(
            state, skeleton, pinned_step=None, question=None,
        )
        # НЕ стримом: буфер всё равно собирается целиком до выдачи шагов наружу
        # (прогрессивной отдачи тут нет), а SSE-поток Cerebras коверкает
        # обратный слэш в LaTeX-командах (\Delta → перенос строки, \frac → rac,
        # \to → таб). Нестримовый ответ отдаёт формулы целыми.
        buf = await self.ai_service._generate(
            prompt_all, f"Сгенерируй шаги в указанном формате. Язык: {locale}",
            None, max_tokens=_MAX_TOKENS["all_steps"], temperature=0.5, use_cache=False,
            task="step_stream", reasoning_effort=settings.LLM_REASONING_EFFORT_GEN,
            timeout=settings.LLM_TIMEOUT_GEN,
        )
        if not buf or buf.startswith(("Error calling AI:", "AI disabled")):
            buf = ""

        info = get_last_call_info() or {}
        report["gen_provider"] = info.get("provider")
        report["gen_fell_back"] = bool(info.get("fell_back"))

        collected = self._complete_steps(buf, final=True)
        collected = {k: _fix_math(c) for k, c in collected.items() if len(c) >= 20}

        # Добор пропущенных процессов точечно.
        regen = 0
        for key in expected_step_keys(skeleton):
            if key in collected:
                continue
            content = await self.regen_process(state, key, skeleton, locale)
            if content:
                collected[key] = _fix_math(content)
                regen += 1
        report["regen"] = regen

        return collected, skeleton

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
        попыток, судья (см. judge_conspect) проверяет каждую попытку целиком;
        при отклонении — новая попытка с ДРУГИМ простейшим процессом, прошлые
        отклонённые попытки передаются архитектору, чтобы не повторялись
        (1_главный_промпт.md п. 6.2.1)."""
        if "steps" not in state:
            state["steps"] = {}

        await self.ground(state)

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

            collected, skeleton = await self._generate_full_attempt(
                state, locale, use_skeleton or attempt > 1, failed_attempts, report)
            
            if skeleton and skeleton.get("applicable") is False:
                logger.info("applicability gate: NOT applicable — %r", state.get("target_goal"))
                verdict = {
                    "applicable": False,
                    "reason": skeleton.get("applicability_reason", ""),
                }
                state["applicability"] = verdict
                yield ("__not_applicable__", verdict)
                return

            if not collected:
                continue

            yield ("__status__", _("gen_status_judging"))
            is_valid, reason, bad_steps = await self.judge_conspect(collected, locale)
            report["judge"] = "passed" if is_valid else "failed"
            if is_valid:
                break

            # Точечный ретрай (см. аудит 2026-09-12, пункт Ж): если судья
            # указал КОНКРЕТНЫЕ переходы (bad_transitions в его ответе — поле
            # опциональное, старый формат ответа просто не заполняет его) и
            # среди них нет Шага 1 (значит сам простейший процесс не под
            # вопросом, пересобирать план незачем) — переписываем только эти
            # шаги на том же скелете, не открывая новую полную попытку.
            if bad_steps and "1" not in bad_steps and skeleton:
                yield ("__status__", _("gen_status_fix_transition"))
                targeted = 0
                for base in bad_steps:
                    for key in expected_step_keys(skeleton):
                        if _base_of(key) != base:
                            continue
                        content = await self.regen_process(state, key, skeleton, locale)
                        if content:
                            collected[key] = _fix_math(content)
                            targeted += 1
                report["regen"] = report.get("regen", 0) + targeted
                if targeted:
                    is_valid, reason, bad_steps = await self.judge_conspect(collected, locale)
                    report["judge"] = "passed" if is_valid else "failed"
                    if is_valid:
                        break

            if attempt == _MAX_GENERATION_ATTEMPTS:
                break
            step1_summary = " / ".join(c for k, c in collected.items() if _base_of(k) == "1")[:200]
            failed_attempts.append({"thesis1": step1_summary, "reason": reason})

        for key in sorted(collected.keys(), key=_sort_key):
            content = collected.get(key)
            if content:
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)

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

        yield ("__report__", self._finalize_report(report, collected, t0))

    @staticmethod
    def _finalize_report(report: dict, collected: Dict[str, str], t0: float) -> dict:
        """Достроить отчёт (degraded/reasons/метрики) и залогировать. Общий для
        основного пути и pinned-регенерации."""
        short_steps = sum(1 for v in collected.values() if len(v) < _MIN_STEP_CHARS)
        expected_min = 6  # 1 + 2 развивающих + 3 + 4 + 5
        report.setdefault("attempts", 1)
        report.setdefault("regen", 0)
        report.setdefault("judge", "skipped")
        report["expected_blocks"] = expected_min
        report["got_blocks"] = len(collected)
        report["short_blocks"] = short_steps
        report["duration_s"] = round(time.time() - t0, 1)

        reasons = []
        if report.get("gen_provider") and report["gen_provider"] != _PRIMARY_GEN_PROVIDER:
            reasons.append("fallback_provider")
        if report["attempts"] >= _MAX_GENERATION_ATTEMPTS and report["judge"] == "failed":
            reasons.append("judge_gave_up")
        if len(collected) < expected_min:
            reasons.append("missing_blocks")
        if short_steps:
            reasons.append("truncated_blocks")
        if report["regen"] >= 3:
            reasons.append("many_regens")
        report["degraded"] = bool(reasons)
        report["reasons"] = reasons

        logger.info(
            "conspect gen: provider=%s fell_back=%s attempts=%d judge=%s regen=%d "
            "blocks=%d/%d short=%d dur=%.1fs degraded=%s%s",
            report.get("gen_provider"), report.get("gen_fell_back"), report["attempts"],
            report["judge"], report["regen"], report["got_blocks"], expected_min,
            short_steps, report["duration_s"], report["degraded"],
            (" reasons=" + ",".join(reasons)) if reasons else "",
        )
        return report

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
        t0 = time.time()
        report: Dict = {"attempts": 1, "regen": 0, "judge": "skipped"}
        if question:
            updated_pinned = await self.regen_step(state, pinned, "", locale, question=question)
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

        pinned_str = str(pinned)
        emitted: Dict[str, str] = {}
        # Нестримовый ответ — как в _generate_full_attempt: SSE Cerebras коверкает
        # LaTeX. Прогресс-индикатор даёт stream_generate_full через __status__.
        buf = await self.ai_service._generate(
            prompt_all, f"Сгенерируй шаги в указанном формате. Язык: {locale}",
            None, max_tokens=_MAX_TOKENS["all_steps"], temperature=0.5, use_cache=False,
            task="step_stream", reasoning_effort=settings.LLM_REASONING_EFFORT_GEN,
            timeout=settings.LLM_TIMEOUT_GEN,
        )
        if not buf or buf.startswith(("Error calling AI:", "AI disabled")):
            buf = ""
        for key, content in self._complete_steps(buf, final=True).items():
            if _base_of(key) == pinned_str:
                continue
            if len(content) >= 20:
                content = _fix_math(content)
                emitted[key] = content
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)
        info = get_last_call_info() or {}
        report["gen_provider"] = info.get("provider")
        report["gen_fell_back"] = bool(info.get("fell_back"))

        # Добор пропущенных шагов (обычно 0). Путь без судьи -> всегда по одному
        # процессу на шаг (см. ограничение специфики в build_all_steps_prompt).
        for i in range(1, 6):
            key = str(i)
            if key == pinned_str or emitted.get(key):
                continue
            content = await self.regen_step(state, i, "", locale)
            if content:
                emitted[key] = content
                report["regen"] += 1
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

        if base_steps:
            yield ("__report__", self._finalize_report(report, base_steps, t0))
