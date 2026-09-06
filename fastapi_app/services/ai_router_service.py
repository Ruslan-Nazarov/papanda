import re
from contextlib import aclosing
from typing import Dict

from fastapi_app.services.context_builder import expected_step_keys

# Ключ шага: "1".."5" (один процесс) или "N.k" (несколько процессов на шаге,
# см. expected_step_keys/9_скелет_конспекта_промпт.md).
_STEP_MARK = re.compile(r"===\s*ШАГ\s*([1-5](?:\.\d+)?)\s*===")


def _sort_key(key: str) -> list:
    return [int(p) for p in key.split(".")]


def _base_of(key: str) -> str:
    return key.split(".")[0]

# Потолки на длину ответа по фазам. С reasoning_effort=low gpt-oss укладывается
# в сотни токенов; запас оставлен на случай развёрнутого вывода формул.
_MAX_TOKENS = {
    "skeleton": 1200,
    "all_steps": 3500,
    "step": 1600,
    "step5": 2800,
    "judge": 400,
    "history": 1300,
}

# Многопроходный поиск простейшего процесса (см. 1_главный_промпт.md п. 4.2.1):
# столько раз пробуем целиком пересобрать конспект с другим простейшим
# процессом, если судья отклоняет предыдущую попытку.
_MAX_GENERATION_ATTEMPTS = 3

# Вспомогательные вызовы (скелет, судья, история) уводим на Gemini-ключ, чтобы
# минутный лимит Groq тратился в основном на стрим шагов. При недоступности
# Gemini — обычный фолбэк по кругу (Groq и т.д.).
_AUX_PREFER = "Gemini"


class ConspectusRouter:
    def __init__(self, ai_service, context_builder, sanitizer, rag_manager):
        # We pass ai_service rather than llm_service because ai_service has the _generate method
        self.ai_service = ai_service
        self.context_builder = context_builder
        self.sanitizer = sanitizer
        self.rag_manager = rag_manager

    async def _gen_json(self, sys_prompt: str, user_msg: str, key: str, max_tokens: int) -> str:
        """Генерация JSON без строгого response_format (Groq gpt-oss часто валит его
        валидатор и уходит в медленный fallback). JSON вытаскиваем санитайзером,
        одна повторная попытка при провале."""
        for attempt in range(2):
            raw = await self.ai_service._generate(
                sys_prompt, user_msg, None, max_tokens=max_tokens, temperature=0.3,
                use_cache=False,
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
        skill = payload.get("skill")

        if action == "generate_full":
            return await self._handle_auto_full(state, locale, skill=skill)

        elif action == "generate_step":
            return await self._handle_auto_step(state, int(target_step), locale, skill=skill)

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
                use_cache=False, prefer=_AUX_PREFER,
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
            prefer=_AUX_PREFER,
        )
        try:
            parsed = self.sanitizer.extract_json(raw)
            is_valid = bool(parsed.get("is_valid", True))
            reason = str(parsed.get("reason", "") or "")
            return is_valid, reason
        except ValueError:
            return True, ""

    async def _generate_full_attempt(self, state: dict, locale: str, use_skeleton: bool,
                                      skill: dict, failed_attempts: list) -> Dict[str, str]:
        """Одна полная попытка собрать все процессы всех шагов, без
        прогрессивной выдачи наружу — используется внутри цикла судьи в
        stream_generate_full. Ключи результата — "1", "2.1", "2.2", ... (см.
        expected_step_keys) в зависимости от того, сколько процессов у
        каждого шага в скелете."""
        skeleton = await self._gen_skeleton(state, locale, failed_attempts=failed_attempts) if use_skeleton else {}
        prompt_all = await self.context_builder.build_all_steps_prompt(
            state, skeleton, pinned_step=None, question=None, skill=skill,
        )
        buf = ""
        async with aclosing(self.ai_service._generate_stream(
            prompt_all, f"Сгенерируй шаги в указанном формате. Язык: {locale}",
            max_tokens=_MAX_TOKENS["all_steps"], temperature=0.35, use_cache=False,
        )) as gen:
            async for delta in gen:
                buf += delta

        collected = self._complete_steps(buf, final=True)
        collected = {k: c for k, c in collected.items() if len(c) >= 20}

        # Добор пропущенных процессов точечно.
        for key in expected_step_keys(skeleton):
            if key in collected:
                continue
            content = await self._regen_process(state, key, skeleton, locale, skill=skill)
            if content:
                collected[key] = content
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
                                   pinned_step: int = None, question: str = None, skill: dict = None):
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
        (1_главный_промпт.md п. 4.2.1).
        skill — {"speaker": "<role_id>", "addressee": "<role_id>"}, см.
        conspect/prompts/скиллы_регистр.json; None = поведение по умолчанию."""
        if "steps" not in state:
            state["steps"] = {}

        try:
            pinned = int(pinned_step) if pinned_step else None
        except (TypeError, ValueError):
            pinned = None

        if pinned:
            async for event in self._stream_pinned_regeneration(state, locale, pinned, question, skill):
                yield event
            return

        failed_attempts = []
        collected: Dict[str, str] = {}
        for attempt in range(1, _MAX_GENERATION_ATTEMPTS + 1):
            if attempt > 1:
                yield ("__status__", f"Предыдущий вариант не прошёл проверку — пробую другой простейший процесс (попытка {attempt} из {_MAX_GENERATION_ATTEMPTS})…")
            elif use_skeleton:
                yield ("__status__", "Собираю план и генерирую конспект…")

            collected = await self._generate_full_attempt(state, locale, use_skeleton or attempt > 1, skill, failed_attempts)
            if not collected:
                continue

            yield ("__status__", "Проверяю, получилось ли настоящее противоречие…")
            is_valid, reason = await self._judge_conspect(collected, locale)
            if is_valid or attempt == _MAX_GENERATION_ATTEMPTS:
                break
            step1_summary = " / ".join(c for k, c in collected.items() if _base_of(k) == "1")[:200]
            failed_attempts.append({"thesis1": step1_summary, "reason": reason})

        for key in sorted(collected.keys(), key=_sort_key):
            content = collected.get(key)
            if content:
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)

        # Доп. проход: историческая форма + расхождение (1_главный п.6).
        if collected:
            yield ("__status__", "Собираю историческую форму и расхождение…")
            history = await self._gen_history(state, collected, locale, skill)
            if history:
                state["steps"]["history"] = {"content": history, "status": "ready", "author": "ai", "sub_steps": []}
                yield ("history", history)

    async def _gen_history(self, state: dict, collected: Dict[str, str], locale: str,
                           skill: dict = None) -> str:
        """Историческая форма конспекта + её расхождение с логической формой.
        Отдельный проход поверх готовых Шагов 1–5, свободный Markdown."""
        prompt = await self.context_builder.build_history_prompt(state, collected, skill=skill)
        prompt = self.rag_manager.enrich_prompt_if_needed(prompt, "generate_step")
        raw = await self.ai_service._generate(
            prompt, f"Построй историческую форму и расхождение. Язык: {locale}",
            None, max_tokens=_MAX_TOKENS["history"], temperature=0.4, use_cache=False,
            prefer=_AUX_PREFER,
        )
        raw = (raw or "").strip()
        if not raw or raw.startswith(("Error calling AI:", "AI disabled")):
            return ""
        return raw

    async def _stream_pinned_regeneration(self, state: dict, locale: str, pinned: int,
                                          question: str, skill: dict):
        """Часть stream_generate_full для кнопки ❓ — вынесено отдельно, без судьи."""
        if question:
            updated_pinned = await self._regen_step(state, pinned, "", locale, question=question, skill=skill)
            if updated_pinned:
                state["steps"][f"step{pinned}"] = {
                    "content": updated_pinned, "status": "ready", "author": "ai", "sub_steps": [],
                }
                yield (f"step{pinned}", updated_pinned)
            # Если перегенерация зафиксированного шага не удалась — продолжаем
            # со старым его текстом, чем прерывать весь запрос пользователя.

        prompt_all = await self.context_builder.build_all_steps_prompt(
            state, {}, pinned_step=pinned, question=None, skill=skill,
        )

        buf, emitted = "", {}
        pinned_str = str(pinned)
        async with aclosing(self.ai_service._generate_stream(
            prompt_all, f"Сгенерируй шаги в указанном формате. Язык: {locale}",
            max_tokens=_MAX_TOKENS["all_steps"], temperature=0.35, use_cache=False,
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
            content = await self._regen_step(state, i, "", locale, skill=skill)
            if content:
                emitted[key] = content
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)

        # Шаги изменились — пересобираем историческую форму (иначе останется старая).
        base_steps = {str(i): (state["steps"].get(f"step{i}", {}) or {}).get("content", "").strip()
                      for i in range(1, 6)}
        base_steps = {k: v for k, v in base_steps.items() if len(v) >= 20}
        if len(base_steps) >= 3:
            yield ("__status__", "Обновляю историческую форму…")
            history = await self._gen_history(state, base_steps, locale, skill)
            if history:
                state["steps"]["history"] = {"content": history, "status": "ready", "author": "ai", "sub_steps": []}
                yield ("history", history)

    async def _handle_auto_full(self, state: dict, locale: str, skill: dict = None) -> dict:
        """Нестримовый путь: собирает результат stream_generate_full целиком.
        Фронт им не пользуется (там SSE), но это программная точка входа для
        бенчмарка: `benchmark_papanda/papanda_bridge.py`, `compare_workbench`.
        Не удалять — вызывается извне."""
        updated_steps = {}
        async for step_key, content in self.stream_generate_full(state, locale, use_skeleton=True, skill=skill):
            if step_key == "__status__":
                continue
            updated_steps[step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}

        if not any(s["content"] for s in updated_steps.values()):
            return {"action_status": "error", "error_message": "Модель не вернула шаги."}
        return {"action_status": "success", "updated_steps": updated_steps, "cascading_events": []}

    async def _regen_step(self, state: dict, step_idx: int, thesis: str, locale: str,
                           question: str = None, skill: dict = None, skeleton: dict = None) -> str:
        prompt = await self.context_builder.build_step_prompt(
            state, step_idx, question=question, skill=skill, skeleton=skeleton or None,
        )
        prompt = self.rag_manager.enrich_prompt_if_needed(prompt, "generate_step")
        if thesis:
            prompt += f"\nРЕКОМЕНДУЕМЫЙ ТЕЗИС ОТ АРХИТЕКТОРА: {thesis}\n"
        max_tokens = _MAX_TOKENS["step5"] if step_idx == 5 else _MAX_TOKENS["step"]
        return await self._gen_json(
            prompt, f"Генерируй шаг {step_idx}. Язык: {locale}", f"step{step_idx}", max_tokens
        )

    async def _regen_process(self, state: dict, key: str, skeleton: dict, locale: str,
                              skill: dict = None) -> str:
        """Добор одного пропущенного процесса по ключу ("1", "2.2", ...) —
        для бесшовных (без точки) ключей просто зовёт _regen_step, для
        составных использует build_process_prompt (несколько процессов на шаге)."""
        base = int(_base_of(key))
        if "." not in key:
            plan = skeleton.get(f"step{base}", {})
            thesis = plan.get("thesis", "") if isinstance(plan, dict) else ""
            return await self._regen_step(state, base, thesis, locale, skill=skill, skeleton=skeleton)

        prompt = await self.context_builder.build_process_prompt(state, key, skeleton, skill=skill)
        prompt = self.rag_manager.enrich_prompt_if_needed(prompt, "generate_step")
        max_tokens = _MAX_TOKENS["step5"] if base == 5 else _MAX_TOKENS["step"]
        return await self._gen_json(
            prompt, f"Генерируй процесс. Язык: {locale}", "process", max_tokens
        )

    async def _handle_auto_step(self, state: dict, target_step: int, locale: str, skill: dict = None) -> dict:
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
                state, target_step, skill=skill, skeleton=skeleton or None,
            )
            prompt = self.rag_manager.enrich_prompt_if_needed(prompt, "generate_step")
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
                content = await self._regen_process(state, key, skeleton, locale, skill=skill)
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
