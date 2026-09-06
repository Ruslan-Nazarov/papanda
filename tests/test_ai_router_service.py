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


@pytest.mark.asyncio
async def test_single_step_regen_emits_multiple_blocks_for_step2():
    """D2: перегенерация Шага 2 в режиме «по шагам» отдаёт несколько блоков
    step2.k, если скелет запланировал несколько процессов."""
    skeleton_json = (
        '{"step2": {"thesis": "развитие А", '
        '"sub_steps": [{"thesis": "развитие Б"}, {"thesis": "развитие В"}]}}'
    )

    async def _gen(sys_prompt, user_msg, *a, **k):
        if "sub_steps" in sys_prompt or "скелет" in user_msg.lower():
            return skeleton_json
        return '{"process": "текст очередного развивающего процесса, достаточно длинный"}'

    ai_service = MagicMock()
    ai_service._generate = AsyncMock(side_effect=_gen)

    rag_manager = MagicMock()
    rag_manager.enrich_prompt_if_needed = MagicMock(side_effect=lambda p, *_a, **_k: p)

    router = ConspectusRouter(ai_service, ContextBuilder(), Sanitizer(), rag_manager)

    state = {"target_goal": "диффузия", "steps": {"step1": {"content": "простейший процесс", "status": "ready"}}}
    res = await router._handle_auto_step(state, 2, "ru")

    assert res["action_status"] == "success"
    generated = {k for k, v in res["updated_steps"].items() if v.get("status") == "draft"}
    assert generated == {"step2.1", "step2.2", "step2.3"}
    assert "step2" not in res["updated_steps"]  # прежнего одиночного блока нет


@pytest.mark.asyncio
async def test_history_pass_appends_history_block():
    """G1: после Шагов 1–5 и судьи идёт доп. проход — блок history с
    исторической формой и расхождением."""
    async def _stream(*_a, **_k):
        yield (
            "===ШАГ1===\nпростейший процесс достаточной длины для парсера\n"
            "===ШАГ2===\nразвитие процесса достаточной длины для парсера\n"
            "===ШАГ3===\nпротивоположность достаточной длины для парсера\n"
            "===ШАГ4===\nпротиворечие достаточной длины для парсера тут\n"
            "===ШАГ5===\nразрешение достаточной длины для парсера тут же\n"
        )

    ai_service = MagicMock()
    ai_service._generate_stream = MagicMock(side_effect=_stream)

    async def _gen(sys_prompt, *_a, **_k):
        if "историческ" in sys_prompt.lower():
            return "## Историческая форма\nтекст\n\n## Расхождение\nтекст"
        if "is_valid" in sys_prompt:
            return '{"is_valid": true, "reason": ""}'
        return "{}"
    ai_service._generate = AsyncMock(side_effect=_gen)

    router = ConspectusRouter(
        ai_service, ContextBuilder(), Sanitizer(),
        MagicMock(enrich_prompt_if_needed=lambda p, *_a, **_k: p),
    )
    state = {"target_goal": "диффузия", "steps": {}}

    events = {}
    async for key, content in router.stream_generate_full(state, "ru", use_skeleton=False):
        if key != "__status__":
            events[key] = content

    assert "history" in events
    assert "Расхождение" in events["history"]
    assert state["steps"]["history"]["content"] == events["history"]
