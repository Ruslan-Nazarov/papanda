import asyncio
import json
from contextlib import aclosing
from copy import deepcopy
from unittest.mock import AsyncMock, MagicMock

import pytest

from fastapi_app.services.ai_router_service import ConspectusRouter
from fastapi_app.services.context_builder import ContextBuilder, _extract_algo_core
from fastapi_app.services.generation.contracts import SecondStage, StageVerdict, JudgeVerdict
from fastapi_app.services.generation.judge import Judge
from fastapi_app.services.generation.json_contract import parse_object
from fastapi_app.services.generation.runtime import GenerationError, GenerationContext, generation_scope, current_run
from fastapi_app.services.generation.transport import sse_response, until_disconnect
from fastapi_app.services.sanitizer import Sanitizer
from test_ai_router_judge import _stage_ok_responses, _text_response


def router_with(generate):
    return ConspectusRouter(MagicMock(_generate=AsyncMock(side_effect=generate)),
                            ContextBuilder(), Sanitizer(), MagicMock(reference_for=AsyncMock(return_value='')))


def plan():
    return {'applicable': True, **{f'step{i}': {'thesis': str(i), 'sub_steps': []} for i in range(1, 6)}}


@pytest.mark.asyncio
async def test_not_applicable_stops_before_any_text_or_judge():
    async def generate(*a, **kw):
        assert kw['task'] == 'skeleton'
        return json.dumps({'applicable': False, 'applicability_reason': 'convention', 'goal_as_process': 'name'})
    router = router_with(generate)
    result = await router.route_request({'action': 'generate_full', 'context_state': {'target_goal': 'name'}, 'source_revision': 7})
    assert result['status'] == 'not_applicable'
    assert result['source_revision'] == 7
    assert result['updated_steps'] == {}
    router.pipeline.ai_service._generate.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize('raw', ['{}', '[]', '"false"', '{"is_valid":"false","reason":"x"}',
    '{"is_valid":true,"reason":"x","bad_transitions":["3"]}',
    'Error calling AI: {"is_valid":true,"reason":"x"}', 'network error', RuntimeError('network failed')])
async def test_bad_judge_never_passes(raw):
    ai = MagicMock(_generate=AsyncMock(side_effect=raw if isinstance(raw, Exception) else None, return_value=raw))
    verdict = await Judge(ai, ContextBuilder(), Sanitizer()).evaluate({'1': 'text'}, 'ru', ['generator'])
    assert verdict.status == 'unavailable'
    assert ai._generate.call_args.kwargs['exclude_models'] == ['generator']


@pytest.mark.parametrize('value', [{'valid': 'false', 'reason': ''}, {}, [], {'valid': True, 'reason': '', 'checks': {'a': False}}])
def test_stage_verdict_rejects_coercion_and_contradictions(value):
    with pytest.raises(ValueError):
        StageVerdict.model_validate(value)


@pytest.mark.parametrize('parents', [('b2', 'b1'), ('missing', 'step1'), ('step1', 'b2')])
def test_planner_rejects_invalid_dependency_graph(parents):
    blocks = [{'id': f'b{i}', 'grows_from': parent, 'thesis': 'x', 'разворачивает': 'x', 'обратный_ход': 'x'}
              for i, parent in enumerate(parents, 1)]
    with pytest.raises(ValueError):
        SecondStage.model_validate({'blocks': blocks})


def test_json_only_allows_object_or_single_fence():
    assert parse_object('```json\n{"valid":false}\n```') == {'valid': False}
    for raw in ('[]', 'Error: {"valid":true}', '{"valid":true} trailing'):
        with pytest.raises(ValueError):
            parse_object(raw)


@pytest.mark.asyncio
async def test_repair_uses_reason_fresh_text_and_regenerates_descendants_in_order():
    router = router_with(None)
    pipeline = router.pipeline
    pipeline.gen_skeleton = AsyncMock(return_value=plan())
    seen = []

    async def process(state, key, skeleton, locale, **kw):
        seen.append((key, deepcopy(state['_process_texts']), kw['reason']))
        return f'{key}-repaired' if kw['reason'] else f'{key}-original'

    pipeline.regen_process = AsyncMock(side_effect=process)
    pipeline.judge.evaluate = AsyncMock(side_effect=[
        JudgeVerdict(status='failed', reason='fix opposition', bad_steps=['3']), JudgeVerdict(status='passed')])
    pipeline.generator.postprocess = AsyncMock(return_value=({}, {}))
    original = {'target_goal': 'goal', 'steps': {'step1': {'content': 'manual'}}}
    result = await router.route_request({'action': 'generate_full', 'context_state': original})
    assert result['status'] == 'completed'
    assert [s[0] for s in seen] == ['1', '2', '3', '4', '5', '3', '4', '5']
    assert seen[5][1]['3'] == '3-original'
    assert seen[6][1]['3'] == '3-repaired'
    assert seen[7][1]['4'] == '4-repaired'
    assert all(s[2] == 'fix opposition' for s in seen[5:])
    assert result['updated_steps']['step1']['content'] == '1-original'
    pipeline.gen_skeleton.assert_awaited_once()
    assert original['steps']['step1']['content'] == 'manual'


@pytest.mark.asyncio
async def test_failure_preserves_only_generated_draft_and_never_claims_judge_passed():
    router = router_with(None)
    router.pipeline.gen_skeleton = AsyncMock(return_value=plan())
    router.pipeline.regen_process = AsyncMock(side_effect=['first', GenerationError('provider_down')])
    result = await router.route_request({'action': 'generate_full', 'context_state': {}})
    assert result['status'] == 'partial'
    assert result['judge']['status'] == 'unavailable'
    assert list(result['updated_steps']) == ['step1']


@pytest.mark.asyncio
async def test_single_step_deadline_does_not_return_previous_manual_steps():
    router = router_with(None)
    router.pipeline.gen_skeleton = AsyncMock(return_value=plan())
    router.pipeline.regen_process = AsyncMock(side_effect=lambda *a, **k: None)
    async def slow(*a, **k):
        await asyncio.sleep(1)
    router.pipeline.regen_process.side_effect = slow
    context = GenerationContext(deadline_seconds=0.02)
    token = current_run.set(None)
    try:
        # Pipeline owns the shared deadline when not wrapped in transport.
        import fastapi_app.services.generation.orchestrator as module
        from unittest.mock import patch
        with patch.object(module, 'GenerationContext', return_value=context):
            result = await router.route_request({'action': 'generate_step', 'target_step': '3',
                'context_state': {'steps': {'step1': {'content': 'manual'}}}})
        assert result['status'] == 'failed'
        assert result['updated_steps'] == {}
    finally:
        current_run.reset(token)


async def frames(source, **kw):
    response = sse_response(source, **kw)
    return [json.loads(chunk.removeprefix('data: ')) async for chunk in response.body_iterator]


@pytest.mark.asyncio
async def test_sse_missing_terminal_is_partial_not_completed():
    async def source():
        yield {'step': 'step1', 'content': 'draft'}
    events = await frames(source(), terminal_required=True)
    assert events[-1]['status'] == 'partial'
    assert sum(e['type'] == 'terminal' for e in events) == 1


@pytest.mark.asyncio
async def test_sse_deadline_retains_applicable_draft_with_replacement_scope():
    async def source():
        current_run.get().collected['1'] = 'draft'
        raise GenerationError('deadline')
        yield
    events = await frames(source(), terminal_required=True, source_revision=4)
    result = events[-1]['result']
    assert result['status'] == 'partial'
    assert result['replace_bases'] == ['1', '2', '3', '4', '5']
    assert result['source_revision'] == 4
    assert result['updated_steps']['step1']['content'] == 'draft'


@pytest.mark.asyncio
async def test_closing_sse_closes_inner_generator_in_same_task():
    closed = []
    async def source():
        try:
            yield {'delta': 'text'}
        finally:
            closed.append(True)
    response = sse_response(source())
    async with aclosing(response.body_iterator) as stream:
        await anext(stream)  # started
        await anext(stream)  # delta
    assert closed == [True]
    assert current_run.get() is None


@pytest.mark.asyncio
async def test_disconnect_cancels_json_provider_work():
    from starlette.requests import ClientDisconnect
    started, cancelled = asyncio.Event(), asyncio.Event()
    async def work():
        started.set()
        try:
            await asyncio.Event().wait()
        finally:
            cancelled.set()
    async def disconnected():
        await started.wait()
        return True
    with pytest.raises(ClientDisconnect):
        await until_disconnect(MagicMock(is_disconnected=disconnected), work())
    assert cancelled.is_set()


def test_algorithm_extraction_handles_escaped_markdown_without_changing_author_lines():
    source = 'Intro\n2\\. Метод\nkeep2\n4\\. Алгоритм\n4\\.4 Противоречие\nkeep4\n6\\. История\nomit6\n7\\. Проверка\nomit7'
    core = _extract_algo_core(source)
    assert '4\\.4 Противоречие' in core
    assert 'keep2' in core and 'keep4' in core
    assert 'omit6' not in core and 'omit7' not in core


def test_algorithm_extraction_keeps_actual_author_numbered_lines():
    from fastapi_app.config import settings
    source = (settings.PROMPTS_DIR / '1_главный_промпт.md').read_text(encoding='utf-8')
    core = _extract_algo_core(source)
    lines = [line for line in source.splitlines() if line.startswith(('2\\.', '4\\.', '4.4', '5\\.'))]
    assert len(lines) >= 4
    assert all(line in core for line in lines)


@pytest.mark.asyncio
async def test_generation_rejects_invalid_input_before_calling_model(client):
    for steps in ({'step0': {'content': 'x'}}, {'step1': {'content': []}}):
        response = await client.post('/api/ai/dialectics/conspectus/route', json={
            'action': 'generate_full', 'context_state': {'steps': steps}})
        assert response.status_code == 422
