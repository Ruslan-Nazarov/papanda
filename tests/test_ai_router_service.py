import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi_app.services.ai_router_service import ConspectusRouter
from fastapi_app.services.context_builder import ContextBuilder
from fastapi_app.services.sanitizer import Sanitizer


async def _fake_stream(*_args, **_kwargs):
    for chunk in [
        "===ШАГ2===\nновый связный текст для шага номер два\n"
        "===ШАГ3===\nновый связный текст для шага номер три\n"
    ]:
        yield chunk


@pytest.mark.asyncio
async def test_pinned_step_is_rewritten_with_question_not_left_untouched():
    """Регрессионный тест на фикс "Pinned-step regeneration": при вопросе,
    заданном к конкретному шагу (кнопка ❓), этот шаг должен ПЕРЕПИСЫВАТЬСЯ
    с учётом вопроса — а не оставаться нетронутым, как было раньше."""
    ai_service = MagicMock()
    ai_service._generate = AsyncMock(return_value='{"step1": "step1 переписан с учётом уточнения"}')
    ai_service._generate_stream = MagicMock(side_effect=_fake_stream)

    context_builder = ContextBuilder()
    sanitizer = Sanitizer()
    rag_manager = MagicMock()
    rag_manager.enrich_prompt_if_needed = MagicMock(side_effect=lambda prompt, *_a, **_k: prompt)

    router = ConspectusRouter(ai_service, context_builder, sanitizer, rag_manager)

    state = {
        "target_goal": "тест",
        "steps": {
            "step1": {"content": "старый текст шага 1", "status": "ready"},
        },
    }

    events = {}
    async for step_key, content in router.stream_generate_full(
        state, "ru", use_skeleton=False, pinned_step=1, question="а если наоборот?"
    ):
        events[step_key] = content

    # Зафиксированный шаг присутствует в выдаче и содержит НОВЫЙ текст —
    # раньше он всегда пропускался (see: `if num == pinned: continue`).
    assert "step1" in events
    assert events["step1"] == "step1 переписан с учётом уточнения"
    assert state["steps"]["step1"]["content"] == "step1 переписан с учётом уточнения"

    # Остальные шаги по-прежнему приходят из общего прохода.
    assert events.get("step2") == "новый связный текст для шага номер два"
    assert events.get("step3") == "новый связный текст для шага номер три"

    # _generate (одиночная перегенерация step1) вызван с промптом, где есть
    # уточнение пользователя.
    first_call_args = ai_service._generate.call_args_list[0]
    assert "а если наоборот?" in first_call_args[0][0]
