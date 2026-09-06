import pytest

from fastapi_app.services.context_builder import ContextBuilder, _effective_goal


def test_effective_goal_prefers_reformulated():
    state = {"target_goal": "теорема Пифагора"}
    skel = {"goal_as_process": "для квадрата гипотенузы взять сумму квадратов катетов"}
    assert _effective_goal(state, skel) == "для квадрата гипотенузы взять сумму квадратов катетов"
    assert _effective_goal(state, {}) == "теорема Пифагора"
    assert _effective_goal(state, None) == "теорема Пифагора"
    # пустое goal_as_process не перебивает сырую цель
    assert _effective_goal(state, {"goal_as_process": "  "}) == "теорема Пифагора"


@pytest.mark.asyncio
async def test_step_prompts_use_reformulated_goal():
    cb = ContextBuilder()
    state = {"target_goal": "теорема Пифагора", "steps": {}}
    skel = {
        "goal_as_process": "для квадрата гипотенузы взять сумму квадратов катетов",
        "step2": {"thesis": "квадраты на сторонах", "sub_steps": [{"thesis": "разность площадей"}]},
    }
    p_all = await cb.build_all_steps_prompt(state, skel)
    p_step = await cb.build_step_prompt(state, 2, skeleton=skel)
    p_proc = await cb.build_process_prompt(state, "2.2", skel)
    for p in (p_all, p_step, p_proc):
        assert "для квадрата гипотенузы взять сумму квадратов катетов" in p


@pytest.mark.asyncio
async def test_judge_prompt_has_development_vs_change_criterion():
    cb = ContextBuilder()
    jp = await cb.build_judge_prompt({"1": "a", "2": "b", "3": "c", "4": "d", "5": "e"})
    assert "рядоположенность" in jp  # критерий «развитие, а не изменение»
