"""Маршрутизация запросов ИИ-конспекта.

`ConspectusRouter` разбирает действие из запроса и дёргает
`GenerationPipeline` (весь LLM-конвейер вынесен в generation_pipeline.py):
- generate_full  → полная потоковая генерация (SSE), либо её нестримовый сбор;
- generate_step  → перегенерация одного шага (ручной режим / «по шагам»).
"""
from fastapi_app.services.context_builder import expected_step_keys
from fastapi_app.services.generation_pipeline import (
    GenerationPipeline,
    _MAX_TOKENS,
    _MAX_GENERATION_ATTEMPTS,   # noqa: F401 — реэкспорт для тестов
    _base_of,
)


class ConspectusRouter:
    def __init__(self, ai_service, context_builder, sanitizer, rag_manager):
        self.ai_service = ai_service
        self.context_builder = context_builder
        self.sanitizer = sanitizer
        self.rag_manager = rag_manager
        self.pipeline = GenerationPipeline(ai_service, context_builder, sanitizer, rag_manager)

    async def route_request(self, payload: dict) -> dict:
        action = payload.get("action")
        state = payload.get("context_state", {})
        target_step = payload.get("target_step")
        locale = payload.get("locale", "ru")

        if action == "generate_full":
            return await self._handle_auto_full(state, locale)
        elif action == "generate_step":
            return await self._handle_auto_step(state, int(target_step), locale)
        return {"action_status": "error", "error_message": "Unknown action"}

    async def stream_generate_full(self, state: dict, locale: str, use_skeleton: bool = False,
                                   pinned_step: int = None, question: str = None):
        """Тонкая обёртка над конвейером — чтобы эндпоинт и тесты патчили
        `conspectus_router.stream_generate_full`."""
        async for event in self.pipeline.stream_generate_full(
            state, locale, use_skeleton=use_skeleton, pinned_step=pinned_step, question=question,
        ):
            yield event

    async def _handle_auto_full(self, state: dict, locale: str) -> dict:
        """Нестримовый путь: собирает результат stream_generate_full целиком.
        Фронт обычно идёт через SSE; этот путь — для `action=generate_full`
        нестримового эндпоинта `/conspectus/route`."""
        updated_steps = {}
        step_titles, note_meta, report = {}, {}, {}
        async for step_key, content in self.stream_generate_full(state, locale, use_skeleton=True):
            if step_key == "__status__":
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
            if step_key == "__not_applicable__":
                return {"action_status": "not_applicable", "verdict": content or {}}
            updated_steps[step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}

        if not any(s["content"] for s in updated_steps.values()):
            return {"action_status": "error", "error_message": "Модель не вернула шаги."}
        return {"action_status": "success", "updated_steps": updated_steps,
                "step_titles": step_titles, "note_meta": note_meta, "report": report, "cascading_events": []}

    async def _handle_auto_step(self, state: dict, target_step: int, locale: str) -> dict:
        await self.pipeline.ground(state)
        # 1. Инвалидация последующих шагов при перегенерации раннего шага
        cascading_events = self._invalidate_subsequent_steps(state, target_step)

        # 2. Шаги 1 и 2 могут состоять из нескольких процессов (как в полной
        # генерации). Пробуем скелет; если для этого шага в нём >1 процесса —
        # каждый идёт отдельным блоком stepN.k.
        skeleton: dict = {}
        step_keys = [str(target_step)]
        if target_step in (1, 2):
            skeleton = await self.pipeline.gen_skeleton(state, locale)
            planned = [k for k in expected_step_keys(skeleton) if _base_of(k) == str(target_step)]
            if len(planned) > 1:
                step_keys = planned

        updated_steps: dict = {}
        if len(step_keys) == 1 and "." not in step_keys[0]:
            # Прежний путь — один блок на шаг.
            max_tokens = _MAX_TOKENS["step5"] if target_step == 5 else _MAX_TOKENS["step"]
            prompt = await self.context_builder.build_step_prompt(
                state, target_step, skeleton=skeleton or None,
            )
            content = await self.pipeline.gen_json(
                prompt, f"Генерируй шаг {target_step}. Язык: {locale}", f"step{target_step}", max_tokens
            )
            if not content:
                return {"action_status": "error", "error_message": "Не удалось сгенерировать шаг (пустой ответ модели)."}
            updated_steps[f"step{target_step}"] = {
                "content": self.sanitizer.clean_markdown_for_editor(content),
                "status": "in_progress", "author": "ai",
            }
        else:
            # Несколько процессов — по блоку на каждый (stepN.k).
            for key in step_keys:
                content = await self.pipeline.regen_process(state, key, skeleton, locale)
                if content:
                    updated_steps[f"step{key}"] = {
                        "content": self.sanitizer.clean_markdown_for_editor(content),
                        "status": "in_progress", "author": "ai",
                    }
            if not updated_steps:
                return {"action_status": "error", "error_message": "Не удалось сгенерировать шаг (пустой ответ модели)."}

        # 3. Принудительная очистка зависимых шагов в интерфейсе
        for event in cascading_events:
            step_to_clear = event.replace("invalidated_", "")
            updated_steps[step_to_clear] = {"content": "", "status": "invalidated", "author": None}

        return {"action_status": "success", "updated_steps": updated_steps,
                "cascading_events": cascading_events}

    @staticmethod
    def _invalidate_subsequent_steps(state: dict, current_step: int) -> list:
        # Если изменён шаг N, то шаги от N+1 до 5 помечаются недействительными.
        events = []
        for i in range(current_step + 1, 6):
            step_key = f"step{i}"
            if state.get("steps", {}).get(step_key, {}).get("status") not in ["empty", "invalidated"]:
                events.append(f"invalidated_{step_key}")
        return events
