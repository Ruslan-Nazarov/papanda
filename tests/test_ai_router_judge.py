import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi_app.services.ai_router_service import ConspectusRouter
from fastapi_app.services.context_builder import ContextBuilder
from fastapi_app.services.sanitizer import Sanitizer


def _stage_ok_responses(tag: str) -> dict:
    """JSON-ответы стадий поблочного скелета (Шаг 1-5, gen+валидация),
    все проходят с первого раза — тест не про надёжность скелета, а про
    ретрай на уровне судьи поверх готового текста."""
    return {
        "Выполни Шаг 1": (
            '{"goal_as_process": "тест-процесс", "applicable": true, "applicability_reason": "ok", '
            '"step1": {"thesis": "простейший", "потенциально_содержит": "x", '
            '"three_conditions": {"a": "x", "b": "y", "c": "z"}}}'
        ),
        "Провалидируй Шаг 1": '{"valid": true, "reason": "ok"}',
        "Выполни Шаг 2": (
            '{"blocks": ['
            '{"id": "b1", "thesis": "развитие1", "grows_from": "step1", "разворачивает": "x", "обратный_ход": "y"}, '
            '{"id": "b2", "thesis": "развитие2", "grows_from": "b1", "разворачивает": "x", "обратный_ход": "y"}'
            ']}'
        ),
        "Провалидируй Шаг 2": '{"valid": true, "problem_block_ids": [], "reason": "ok"}',
        "Выполни Шаг 3": '{"step3": {"thesis": "противоположный", "обходится_без": "x"}}',
        "Провалидируй Шаг 3": '{"valid": true, "reason": "ok"}',
        "Выполни Шаг 4": (
            '{"step4": {"thesis": "противоречие", "несовместимость": "x", '
            '"необходимость_A": "a", "необходимость_B": "b"}}'
        ),
        "Провалидируй Шаг 4": '{"valid": true, "reason": "ok"}',
        "Выполни Шаг 5": '{"step5": {"thesis": "разрешение", "тип_разрешения": "замена", "скачок": "x"}}',
        "Провалидируй Шаг 5": '{"valid": true, "reason": "ok"}',
    }


def _text_response(user_prompt: str, tag: str) -> str:
    """Ответ на генерацию ТЕКСТА одного блока (regen_step/regen_process) —
    JSON-формат зависит от того, составной ли ключ ("Генерируй шаг N" vs
    "Генерируй процесс"), см. generation_pipeline.regen_process."""
    filler = f"{tag} текст блока довольно длинный, чтобы не считаться оборванным совсем не короткий"
    if user_prompt.startswith("Генерируй шаг"):
        step_num = user_prompt.split()[2].rstrip(".")
        return f'{{"step{step_num}": "{filler}"}}'
    if user_prompt.startswith("Генерируй процесс"):
        return f'{{"process": "{filler}"}}'
    return "{}"


@pytest.mark.asyncio
async def test_judge_rejects_first_attempt_then_accepts_second():
    """Регрессионный тест на "многопроходный поиск простейшего процесса":
    если судья отклоняет первую попытку, роутер должен собрать конспект
    ЗАНОВО (другой простейший процесс) и передать архитектору информацию
    о неудачной попытке, а не просто сдаться или вернуть плохой результат."""
    ai_service = MagicMock()
    counters = {"skeleton_attempt": 0, "judge_calls": 0}

    async def generate_side_effect(sys_prompt, user_prompt="", *_args, **_kwargs):
        if "Оцени конспект" in user_prompt:
            if counters["judge_calls"] == 0:
                counters["judge_calls"] += 1
                return '{"is_valid": false, "reason": "натянутое противоречие"}'
            return '{"is_valid": true, "reason": "нормально"}'
        if "Выполни Шаг 1" in user_prompt:
            counters["skeleton_attempt"] += 1
        for marker, response in _stage_ok_responses("").items():
            if marker in user_prompt:
                return response
        tag = "плохой" if counters["skeleton_attempt"] == 1 else "хороший"
        return _text_response(user_prompt, tag)

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
        elif not step_key.startswith("__"):
            events[step_key] = content

    # Итог — второй (хороший) вариант, не первый отклонённый.
    assert "хороший" in events["step1"]
    assert "плохой" not in events["step1"]

    # Судью реально вызвали дважды (отклонение + принятие).
    assert counters["judge_calls"] == 1  # инкрементится один раз при первом (отклоняющем) вызове

    # Скелет собирался дважды — то есть была вторая полная попытка.
    assert counters["skeleton_attempt"] == 2

    # Был хотя бы один статус-эвент (для UI-анимации) о повторной попытке.
    assert any("попытка" in s.lower() or "провер" in s.lower() for s in statuses)


@pytest.mark.asyncio
async def test_judge_gives_up_after_max_attempts_and_returns_last_result():
    """Если судья отклоняет все попытки подряд — не зависаем бесконечно, отдаём
    последнюю попытку пользователю (лучше так, чем ничего)."""
    ai_service = MagicMock()
    counters = {"skeleton_attempt": 0}

    async def generate_side_effect(sys_prompt, user_prompt="", *_args, **_kwargs):
        if "Оцени конспект" in user_prompt:
            return '{"is_valid": false, "reason": "всё ещё не то"}'
        if "Выполни Шаг 1" in user_prompt:
            counters["skeleton_attempt"] += 1
        for marker, response in _stage_ok_responses("").items():
            if marker in user_prompt:
                return response
        return _text_response(user_prompt, f"attempt{counters['skeleton_attempt']}")

    ai_service._generate = AsyncMock(side_effect=generate_side_effect)

    router = ConspectusRouter(
        ai_service, ContextBuilder(), Sanitizer(),
        MagicMock(enrich_prompt_if_needed=lambda p, *_a, **_k: p),
    )
    state = {"target_goal": "тест", "steps": {}}

    events = {}
    async for step_key, content in router.stream_generate_full(state, "ru", use_skeleton=True):
        if step_key != "__status__" and not step_key.startswith("__"):
            events[step_key] = content

    from fastapi_app.services.generation_pipeline import _MAX_GENERATION_ATTEMPTS
    assert counters["skeleton_attempt"] == _MAX_GENERATION_ATTEMPTS  # ровно столько попыток, не бесконечно
    assert f"attempt{_MAX_GENERATION_ATTEMPTS}" in events["step1"]  # отдали последнюю попытку
