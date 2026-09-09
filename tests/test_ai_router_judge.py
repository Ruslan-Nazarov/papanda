import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi_app.services.ai_router_service import ConspectusRouter
from fastapi_app.services.context_builder import ContextBuilder
from fastapi_app.services.sanitizer import Sanitizer


def _stream_factory(text):
    async def _fake_stream(*_args, **_kwargs):
        yield text
    return _fake_stream


@pytest.mark.asyncio
async def test_judge_rejects_first_attempt_then_accepts_second():
    """Регрессионный тест на "многопроходный поиск простейшего процесса":
    если судья отклоняет первую попытку, роутер должен собрать конспект
    ЗАНОВО (другой простейший процесс) и передать архитектору информацию
    о неудачной попытке, а не просто сдаться или вернуть плохой результат."""
    ai_service = MagicMock()

    bad_steps_text = (
        "===ШАГ1===\nплохой простейший процесс текст с достаточной длиной\n"
        "===ШАГ2===\nразвитие плохого процесса текст с достаточной длиной\n"
        "===ШАГ3===\nпротивоположность плохая текст с достаточной длиной\n"
        "===ШАГ4===\nпротиворечие плохое текст с достаточной длиной тут\n"
        "===ШАГ5===\nразрешение плохое текст с достаточной длиной тут\n"
    )
    good_steps_text = (
        "===ШАГ1===\nхороший простейший процесс текст с достаточной длиной\n"
        "===ШАГ2===\nразвитие хорошего процесса текст с достаточной длиной\n"
        "===ШАГ3===\nпротивоположность хорошая текст с достаточной длиной\n"
        "===ШАГ4===\nпротиворечие настоящее текст с достаточной длиной тут\n"
        "===ШАГ5===\nразрешение настоящее текст с достаточной длиной тут\n"
    )

    # _generate вызывается для: скелет (JSON), генерация всех шагов (===ШАГ…),
    # судья (JSON). Различаем по промптам.
    stream_calls = {"n": 0}
    async def generate_side_effect(sys_prompt, user_prompt="", *_args, **_kwargs):
        if "is_valid" in sys_prompt:
            # Первый вызов судьи -> отклонить, второй -> принять
            if generate_side_effect.judge_calls == 0:
                generate_side_effect.judge_calls += 1
                return '{"is_valid": false, "reason": "натянутое противоречие"}'
            return '{"is_valid": true, "reason": "нормально"}'
        if "Сгенерируй шаги" in user_prompt:
            stream_calls["n"] += 1
            return bad_steps_text if stream_calls["n"] == 1 else good_steps_text
        # Скелет
        return '{"step1": {"thesis": "тест", "sub_steps": []}}'
    generate_side_effect.judge_calls = 0
    ai_service._generate = AsyncMock(side_effect=generate_side_effect)

    context_builder = ContextBuilder()
    sanitizer = Sanitizer()
    rag_manager = MagicMock()
    rag_manager.enrich_prompt_if_needed = MagicMock(side_effect=lambda prompt, *_a, **_k: prompt)

    router = ConspectusRouter(ai_service, context_builder, sanitizer, rag_manager)
    state = {"target_goal": "тест", "steps": {}}

    events = {}
    statuses = []
    async for step_key, content in router.stream_generate_full(state, "ru", use_skeleton=True):
        if step_key == "__status__":
            statuses.append(content)
        else:
            events[step_key] = content

    # Итог — второй (хороший) вариант, не первый отклонённый.
    assert "хороший" in events["step1"]
    assert "плохой" not in events["step1"]

    # Судью реально вызвали дважды (отклонение + принятие).
    assert generate_side_effect.judge_calls == 1  # инкрементится один раз при первом (отклоняющем) вызове

    # generate_stream вызван дважды — то есть была вторая полная попытка.
    assert stream_calls["n"] == 2

    # Был хотя бы один статус-эвент (для UI-анимации) о повторной попытке.
    assert any("попытка" in s.lower() or "провер" in s.lower() for s in statuses)


@pytest.mark.asyncio
async def test_judge_gives_up_after_max_attempts_and_returns_last_result():
    """Если судья отклоняет все попытки подряд — не зависаем бесконечно, отдаём
    последнюю попытку пользователю (лучше так, чем ничего)."""
    ai_service = MagicMock()

    def make_steps(tag):
        return (
            f"===ШАГ1===\n{tag} простейший процесс текст с достаточной длиной\n"
            f"===ШАГ2===\n{tag} развитие процесса текст с достаточной длиной\n"
            f"===ШАГ3===\n{tag} противоположность текст с достаточной длиной\n"
            f"===ШАГ4===\n{tag} противоречие текст с достаточной длиной тут\n"
            f"===ШАГ5===\n{tag} разрешение текст с достаточной длиной тут\n"
        )

    stream_calls = {"n": 0}
    async def generate_side_effect(sys_prompt, user_prompt="", *_args, **_kwargs):
        if "is_valid" in sys_prompt:
            return '{"is_valid": false, "reason": "всё ещё не то"}'
        if "Сгенерируй шаги" in user_prompt:
            stream_calls["n"] += 1
            return make_steps(f"attempt{stream_calls['n']}")
        return '{"step1": {"thesis": "тест", "sub_steps": []}}'
    ai_service._generate = AsyncMock(side_effect=generate_side_effect)

    router = ConspectusRouter(ai_service, ContextBuilder(), Sanitizer(), MagicMock(enrich_prompt_if_needed=lambda p, *_a, **_k: p))
    state = {"target_goal": "тест", "steps": {}}

    events = {}
    async for step_key, content in router.stream_generate_full(state, "ru", use_skeleton=True):
        if step_key != "__status__":
            events[step_key] = content

    from fastapi_app.services.ai_router_service import _MAX_GENERATION_ATTEMPTS
    assert stream_calls["n"] == _MAX_GENERATION_ATTEMPTS  # ровно столько попыток, не бесконечно
    assert f"attempt{_MAX_GENERATION_ATTEMPTS}" in events["step1"]  # отдали последнюю попытку


@pytest.mark.asyncio
async def test_handle_judge_returns_verdict_without_regenerating():
    """Кнопка «Проверить»: action=judge гоняет судью по готовому конспекту,
    возвращает вердикт + причину, ничего не перегенерирует."""
    ai_service = MagicMock()
    ai_service._generate = AsyncMock(return_value='{"is_valid": false, "reason": "Шаг 3 просто отличается от Шага 1"}')

    router = ConspectusRouter(
        ai_service, ContextBuilder(), Sanitizer(),
        MagicMock(enrich_prompt_if_needed=lambda p, *_a, **_k: p),
    )
    state = {
        "target_goal": "диффузия",
        "steps": {f"step{i}": {"content": f"текст шага {i} достаточной длины для проверки"} for i in range(1, 6)},
    }
    res = await router.route_request({"action": "judge", "context_state": state, "locale": "ru"})

    assert res["action_status"] == "success"
    assert res["is_valid"] is False
    assert "Шаг 3" in res["reason"]
    # только один вызов LLM — сам судья, никакой перегенерации
    assert ai_service._generate.await_count == 1


@pytest.mark.asyncio
async def test_handle_judge_rejects_too_short_note():
    ai_service = MagicMock()
    ai_service._generate = AsyncMock()
    router = ConspectusRouter(
        ai_service, ContextBuilder(), Sanitizer(),
        MagicMock(enrich_prompt_if_needed=lambda p, *_a, **_k: p),
    )
    state = {"target_goal": "x", "steps": {"step1": {"content": "короткий текст шага один"}}}
    res = await router.route_request({"action": "judge", "context_state": state, "locale": "ru"})
    assert res["action_status"] == "error"
    ai_service._generate.assert_not_awaited()
