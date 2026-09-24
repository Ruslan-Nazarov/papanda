import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi_app.services.ai_router_service import ConspectusRouter
from fastapi_app.services.context_builder import ContextBuilder
from fastapi_app.services.sanitizer import Sanitizer


@pytest.mark.asyncio
async def test_pinned_step_is_rewritten_with_question_not_left_untouched():
    from test_ai_router_judge import _stage_ok_responses, _text_response

    async def generate(prompt, message='', *a, **kw):
        for marker, response in _stage_ok_responses('').items():
            if marker in message:
                return response
        if 'Оцени конспект' in message:
            return '{"is_valid": true, "reason": "ok"}'
        if 'Генерируй шаг 1' in message:
            assert 'а если наоборот?' in prompt
            assert 'старый текст' in prompt
        return _text_response(message, 'переписан')

    ai = MagicMock(_generate=AsyncMock(side_effect=generate))
    router = ConspectusRouter(ai, ContextBuilder(), Sanitizer(), MagicMock())
    state = {'target_goal': 'тест', 'steps': {'step1': {'content': 'старый текст', 'status': 'ready'}}}
    events = {k: v async for k, v in router.stream_generate_full(state, 'ru', pinned_step=1, question='а если наоборот?')}
    assert 'переписан' in events['step1']
    assert 'переписан' in events['step2.1']
    assert state['steps']['step1']['content'] == 'старый текст'
    assert events['__terminal__']['status'] == 'completed'


@pytest.mark.asyncio
async def test_single_step_regen_emits_multiple_blocks_for_step2(client):
    """D2: перегенерация Шага 2 в режиме «по шагам» отдаёт несколько блоков
    step2.k, если скелет запланировал несколько процессов."""
    from test_ai_router_judge import _stage_ok_responses, _text_response

    # Три блока на Шаге 2 (главный + два sub_steps) — та же поблочная схема,
    # что и в gen_skeleton, только с тремя процессами вместо двух.
    stages = dict(_stage_ok_responses(""))
    stages["Выполни Шаг 2"] = (
        '{"blocks": ['
        '{"id": "b1", "thesis": "развитие А", "grows_from": "step1", "разворачивает": "x", "обратный_ход": "y"}, '
        '{"id": "b2", "thesis": "развитие Б", "grows_from": "b1", "разворачивает": "x", "обратный_ход": "y"}, '
        '{"id": "b3", "thesis": "развитие В", "grows_from": "b1", "разворачивает": "x", "обратный_ход": "y"}'
        ']}'
    )

    async def _gen(sys_prompt, user_msg="", *a, **k):
        for marker, response in stages.items():
            if marker in user_msg:
                return response
        return _text_response(user_msg, "ok")

    ai_service = MagicMock()
    ai_service._generate = AsyncMock(side_effect=_gen)

    rag_manager = MagicMock()

    router = ConspectusRouter(ai_service, ContextBuilder(), Sanitizer(), rag_manager)

    state = {"target_goal": "диффузия", "steps": {"step1": {"content": "простейший процесс", "status": "ready"}}}
    res = await router._handle_auto_step(state, 2, "ru")

    assert res["action_status"] == "success"
    generated = {k for k, v in res["updated_steps"].items() if v.get("status") == "in_progress"}
    assert generated == {"step2.1", "step2.2", "step2.3"}
    assert "step2" not in res["updated_steps"]  # прежнего одиночного блока нет
    saved = await client.post('/api/dialectics/save', json={
        'title': 'Generated step', 'blocks': [
            {'id': key.replace('.', '-'), 'role': key, 'side': 'left', 'html': item['content'], 'status': item['status']}
            for key, item in res['updated_steps'].items() if key in generated
        ],
    })
    assert saved.status_code == 200, saved.text
    loaded = await client.get(f"/api/dialectics/{saved.json()['id']}")
    assert len(loaded.json()['content_json']) == 3
    assert all(b['status'] == 'in_progress' and b['html'] for b in loaded.json()['content_json'])


@pytest.mark.asyncio
async def test_postprocess_pass_emits_titles_and_meta():
    """После Шагов 1–5 и судьи идёт доп. проход — события __titles__
    (заголовок-суть на каждый ключ) и __note_meta__ (имя конспекта + вывод).
    Историческая справка убрана из этого прохода (см. коммит 810c393).
    use_skeleton=False сохраняется как совместимый параметр; план обязателен."""
    from test_ai_router_judge import _text_response, _stage_ok_responses

    async def _gen(sys_prompt, user_prompt="", *_a, **_k):
        for marker, response in _stage_ok_responses("").items():
            if marker in user_prompt:
                return response
        if "titles" in user_prompt or "anchor_summary" in user_prompt:
            return ('{"titles": {"1": "как всё началось", "5": "чем разрешилось"}, '
                    '"note_title": "Диффузия и выравнивание", '
                    '"anchor_title": "Диффузия выравнивает концентрацию", '
                    '"anchor_summary": "Частицы переходят из плотных мест в разреженные, пока не станет ровно."}')
        if "Оцени конспект" in user_prompt:
            return '{"is_valid": true, "reason": ""}'
        return _text_response(user_prompt, "ok")
    ai_service = MagicMock()
    ai_service._generate = AsyncMock(side_effect=_gen)

    router = ConspectusRouter(
        ai_service, ContextBuilder(), Sanitizer(),
        MagicMock(),
    )
    state = {"target_goal": "диффузия", "steps": {}}

    events = {}
    async for key, content in router.stream_generate_full(state, "ru", use_skeleton=False):
        if key not in ("__status__",):
            events[key] = content

    assert events["__titles__"] == {"1": "как всё началось", "5": "чем разрешилось"}
    assert events["__terminal__"]["step_titles"]["5"] == "чем разрешилось"
    assert events["__note_meta__"] == {
        "note_title": "Диффузия и выравнивание",
        "anchor_title": "Диффузия выравнивает концентрацию",
        "anchor_summary": "Частицы переходят из плотных мест в разреженные, пока не станет ровно.",
    }
    assert events["__terminal__"]["note_meta"]["note_title"] == "Диффузия и выравнивание"
    assert state == {"target_goal": "диффузия", "steps": {}}
    # Отчёт о прогоне тоже приходит.
    assert "__report__" in events
    assert events["__report__"]["judge"] == "passed"


@pytest.mark.asyncio
async def test_report_flags_degraded_on_fallback_provider():
    from test_ai_router_judge import _stage_ok_responses, _text_response
    from fastapi_app.services.generation.runtime import current_run

    async def generate(prompt, message='', *a, **kw):
        for marker, response in _stage_ok_responses('').items():
            if marker in message:
                return response
        if 'Оцени конспект' in message:
            return '{"is_valid": true, "reason": "ok"}'
        if kw.get('task') == 'step_stream':
            call = current_run.get().reserve('Groq', 'fallback-model', [], 100, 'step_stream')
            call['status'] = 'completed'
        return _text_response(message, 'ok')

    router = ConspectusRouter(MagicMock(_generate=AsyncMock(side_effect=generate)), ContextBuilder(), Sanitizer(), MagicMock())
    events = {k: v async for k, v in router.stream_generate_full({'target_goal': 'рост', 'steps': {}}, 'ru')}
    report = events['__report__']
    assert report['degraded'] is True
    assert 'fallback_provider' in report['reasons']
    assert report['gen_provider'] == 'Groq'
    assert report['call_count'] == 6


def test_condense_step_keeps_claim_and_handoff():
    from fastapi_app.services.context_builder import ContextBuilder
    long = ("Первое предложение с заявкой шага. " + "Середина. " * 40
            + "Последнее предложение с передачей дальше.")
    out = ContextBuilder._condense_step(long, 200)
    assert out.startswith("Первое предложение с заявкой шага.")
    assert out.endswith("Последнее предложение с передачей дальше.")
    assert "[…]" in out
    # короткий текст возвращается как есть
    assert ContextBuilder._condense_step("Коротко.", 200) == "Коротко."
