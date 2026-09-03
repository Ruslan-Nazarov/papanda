import re
from contextlib import aclosing
from typing import Dict

_STEP_MARK = re.compile(r"===\s*ШАГ\s*([1-5])\s*===")

# Потолки на длину ответа по фазам. С reasoning_effort=low gpt-oss укладывается
# в сотни токенов; запас оставлен на случай развёрнутого вывода формул.
_MAX_TOKENS = {
    "skeleton": 1200,
    "all_steps": 3500,
    "step": 1600,
    "step5": 2800,
    "assistant": 1600,
}


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
        user_prompt = payload.get("user_prompt")
        locale = payload.get("locale", "ru")

        if action == "generate_full":
            return await self._handle_auto_full(state, locale)
        
        elif action == "generate_step":
            return await self._handle_auto_step(state, int(target_step), locale)
        
        elif action == "ask_assistant":
            return await self._handle_ask_assistant(state, int(target_step), user_prompt, locale)
        
        else:
            return {"action_status": "error", "error_message": "Unknown action"}

    async def _gen_skeleton(self, state: dict, locale: str) -> dict:
        """План-скелет на быстрой модели (у неё отдельный лимит частоты).
        Не критичен — при провале возвращаем {}."""
        prompt = await self.context_builder.build_skeleton_prompt(state)
        for _ in range(2):
            raw = await self.ai_service._generate(
                prompt, f"Сгенерируй скелет. Верни только JSON. Язык: {locale}",
                None, max_tokens=_MAX_TOKENS["skeleton"], temperature=0.3, fast=True, use_cache=False,
            )
            try:
                parsed = self.sanitizer.extract_json(raw)
                if isinstance(parsed, dict):
                    return parsed
            except ValueError:
                pass
        return {}

    @staticmethod
    def _complete_steps(buf: str, final: bool) -> Dict[int, str]:
        """Из накопленного буфера с маркерами ===ШАГN=== достаёт тексты тех шагов,
        которые уже полностью получены (есть следующий маркер, либо поток завершён)."""
        marks = list(_STEP_MARK.finditer(buf))
        out: Dict[int, str] = {}
        for i, m in enumerate(marks):
            num = int(m.group(1))
            start = m.end()
            if i + 1 < len(marks):
                end, done = marks[i + 1].start(), True
            else:
                end, done = len(buf), final
            if done:
                text = buf[start:end].strip().strip("`").strip()
                if text:
                    out[num] = text
        return out

    async def stream_generate_full(self, state: dict, locale: str, use_skeleton: bool = False,
                                   pinned_step: int = None, question: str = None):
        """Генератор (step_key, content): выдаёт каждый шаг, как только модель
        его дописала. Недостающие шаги добираются точечно в конце.
        use_skeleton=False (по умолчанию для стрима): без отдельного вызова-плана,
        чтобы первый блок появлялся быстрее.
        pinned_step задан → этот шаг не трогаем и не выдаём, остальные
        перегенерируем согласованно (с учётом question)."""
        if "steps" not in state:
            state["steps"] = {}

        try:
            pinned = int(pinned_step) if pinned_step else None
        except (TypeError, ValueError):
            pinned = None

        skeleton = await self._gen_skeleton(state, locale) if (use_skeleton and not pinned) else {}
        prompt_all = await self.context_builder.build_all_steps_prompt(
            state, skeleton, pinned_step=pinned, question=question
        )

        buf, emitted = "", {}
        async with aclosing(self.ai_service._generate_stream(
            prompt_all, f"Сгенерируй шаги в указанном формате. Язык: {locale}",
            max_tokens=_MAX_TOKENS["all_steps"], temperature=0.35, use_cache=False,
        )) as gen:
            async for delta in gen:
                buf += delta
                for num, content in self._complete_steps(buf, final=False).items():
                    if num == pinned:
                        continue
                    if len(content) >= 20 and emitted.get(num) != content:
                        emitted[num] = content
                        state["steps"][f"step{num}"] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                        yield (f"step{num}", content)

        # Хвост потока — финализируем последний шаг.
        for num, content in self._complete_steps(buf, final=True).items():
            if num == pinned:
                continue
            if len(content) >= 20 and emitted.get(num) != content:
                emitted[num] = content
                state["steps"][f"step{num}"] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (f"step{num}", content)

        # Добор пропущенных шагов (обычно 0).
        for i in range(1, 6):
            if i == pinned or emitted.get(i):
                continue
            plan = skeleton.get(f"step{i}", {})
            thesis = plan.get("thesis", "") if isinstance(plan, dict) else ""
            content = await self._regen_step(state, i, thesis, locale)
            if content:
                emitted[i] = content
                state["steps"][f"step{i}"] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (f"step{i}", content)

    async def _handle_auto_full(self, state: dict, locale: str) -> dict:
        """Нестримовый путь: собирает результат stream_generate_full целиком."""
        updated_steps = {}
        async for step_key, content in self.stream_generate_full(state, locale, use_skeleton=True):
            updated_steps[step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}

        if not any(s["content"] for s in updated_steps.values()):
            return {"action_status": "error", "error_message": "Модель не вернула шаги."}
        return {"action_status": "success", "updated_steps": updated_steps, "cascading_events": []}

    async def _regen_step(self, state: dict, step_idx: int, thesis: str, locale: str) -> str:
        prompt = await self.context_builder.build_step_prompt(state, step_idx)
        prompt = self.rag_manager.enrich_prompt_if_needed(prompt, "generate_step")
        if thesis:
            prompt += f"\nРЕКОМЕНДУЕМЫЙ ТЕЗИС ОТ АРХИТЕКТОРА: {thesis}\n"
        max_tokens = _MAX_TOKENS["step5"] if step_idx == 5 else _MAX_TOKENS["step"]
        return await self._gen_json(
            prompt, f"Генерируй шаг {step_idx}. Язык: {locale}", f"step{step_idx}", max_tokens
        )

    async def _handle_auto_step(self, state: dict, target_step: int, locale: str) -> dict:
        # 1. Инвалидация последующих шагов при перегенерации раннего шага
        cascading_events = self._invalidate_subsequent_steps(state, target_step)
        
        # 2. Сборка контекста только для запрашиваемого шага
        prompt = await self.context_builder.build_step_prompt(state, target_step)
        prompt = self.rag_manager.enrich_prompt_if_needed(prompt, "generate_step")

        step_key = f"step{target_step}"
        max_tokens = _MAX_TOKENS["step5"] if target_step == 5 else _MAX_TOKENS["step"]
        content = await self._gen_json(
            prompt, f"Генерируй шаг {target_step}. Язык: {locale}", step_key, max_tokens
        )
        if not content:
            return {"action_status": "error", "error_message": "Не удалось сгенерировать шаг (пустой ответ модели)."}

        updated_steps = {
            step_key: {
                "content": self.sanitizer.clean_markdown_for_editor(content),
                "status": "draft",
                "author": "ai"
            }
        }
        
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

    async def _handle_ask_assistant(self, state: dict, target_step: int, user_prompt: str, locale: str) -> dict:
        # Режим ручного заполнения: ИИ выступает консультантом
        prompt = await self.context_builder.build_assistant_prompt(state, target_step, user_prompt)
        prompt = self.rag_manager.enrich_prompt_if_needed(prompt, "ask_assistant", user_prompt)

        response = await self.ai_service._generate(prompt, f"Ответ на {locale}.", max_tokens=_MAX_TOKENS["assistant"])

        return {
            "action_status": "success",
            "assistant_reply": self.sanitizer.clean_markdown_for_editor(response),
            "cascading_events": []
        }

    async def stream_ask_assistant(self, state: dict, target_step: int, user_prompt: str, locale: str):
        prompt = await self.context_builder.build_assistant_prompt(state, target_step, user_prompt)
        prompt = self.rag_manager.enrich_prompt_if_needed(prompt, "ask_assistant", user_prompt)
        async with aclosing(self.ai_service._generate_stream(
            prompt, f"Ответ на {locale}.", max_tokens=_MAX_TOKENS["assistant"]
        )) as g:
            async for d in g:
                yield d

    def _invalidate_subsequent_steps(self, state: dict, current_step: int) -> list:
        # Если изменен шаг N, то шаги от N+1 до 5 помечаются недействительными
        events = []
        for i in range(current_step + 1, 6):
            step_key = f"step{i}"
            if state.get("steps", {}).get(step_key, {}).get("status") not in ["empty", "invalidated"]:
                events.append(f"invalidated_{step_key}")
        return events
