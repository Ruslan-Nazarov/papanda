"""Regressions found by comparing authored prompt contracts with both generation paths."""
import json
from copy import deepcopy
from unittest.mock import AsyncMock, MagicMock

import pytest
from dialectic_world import Context, Settings
from dialectic_world.builder.blocks import BlockFailed
from dialectic_world.trace import Trace

from fastapi_app.services.generation import engine_contracts as contracts
from fastapi_app.services.generation.note_context import source_signature, prompt_signature
from fastapi_app.services.generation.presentation import present, final_sources
from fastapi_app.services.generation.scoped_dialectic_builder import build_world
from fastapi_app.services.generation.step_builder import build_step, world_from_steps
from fastapi_app.services.generation.dialectic_v3_pipeline import build_generation_result
from tests.test_scoped_dialectic_builder import ScriptedLLM, GOAL


def ctx(tmp_path, llm):
    return Context(llm=llm, settings=Settings(prompt_language='en'), trace=Trace(tmp_path / 'trace.jsonl'))


def snapshot(reference=None):
    steps = {'step1': {'content': 'visible P0'}}
    world = world_from_steps(GOAL, steps, 2)
    world.p0_explanation = {'why_initial': 'saved explanation'}
    steps['step1']['generation_data'] = {'world': world.model_dump(),
        'dependencies': {'step1': 'visible P0'}, 'source_signature': source_signature(GOAL, reference),
        'prompt_signature': prompt_signature()}
    return steps


def test_changed_document_invalidates_engine_snapshot():
    steps = snapshot('document A')
    assert world_from_steps(GOAL, steps, 2, 'document A').p0_explanation
    assert world_from_steps(GOAL, steps, 2, 'document B').p0_explanation == {}
    assert world_from_steps(GOAL, steps, 2, None).p0_explanation == {}


def test_old_prompt_version_does_not_reuse_previous_verdicts():
    steps = snapshot()
    steps['step1']['generation_data']['prompt_signature'] = 'previous version'
    assert world_from_steps(GOAL, steps, 2).p0_explanation == {}


@pytest.mark.parametrize('bad_world', [[], {'domain': GOAL, 'p0': {'broken': True}}])
def test_bad_metadata_falls_back_to_visible_text(bad_world):
    steps = snapshot()
    steps['step1']['generation_data']['world'] = bad_world
    assert world_from_steps(GOAL, steps, 2).p0.statement == 'visible P0'


@pytest.mark.asyncio
async def test_manual_opposite_is_checked_before_contradiction(tmp_path):
    llm = ScriptedLLM(opposition='NOT_OPPOSITE')
    state = {'steps': {f'step{i}': {'content': f'manual {i}'} for i in range(1, 4)}}
    with pytest.raises(ValueError, match='не подтверждена'):
        await build_step(GOAL, ctx(tmp_path, llm), state, 4)
    assert [b for b, _ in llm.calls] == ['CheckOpposition']


@pytest.mark.asyncio
async def test_manual_contradiction_is_validated_without_rewriting_before_leap(tmp_path):
    llm = ScriptedLLM(opposition='OPPOSITE')
    state = {'steps': {f'step{i}': {'content': f'manual {i}'} for i in range(1, 5)}}
    world = await build_step(GOAL, ctx(tmp_path, llm), state, 5)
    assert world.contradiction.raw['contradiction'] == 'manual 4'
    leap_prompt = next(p for b, p in llm.calls if b == 'ResolveLeap')
    assert 'manual 4' in leap_prompt
    assert state['steps']['step4']['content'] == 'manual 4'


@pytest.mark.asyncio
async def test_manual_and_full_p0_treat_insufficient_scope_the_same(tmp_path):
    llm = ScriptedLLM(scopes=['INSUFFICIENT'])
    world = await build_step(GOAL, ctx(tmp_path, llm), {'steps': {}}, 1)
    assert world.status == 'no_opposite' and not world.rejected_p0
    assert len(llm.calls) == 2


@pytest.mark.asyncio
@pytest.mark.parametrize('mutation', ['missing_evidence', 'duplicate', 'unproved'])
async def test_opposition_contract_requires_evidence_not_just_enums(tmp_path, mutation):
    llm = ScriptedLLM(opposition='OPPOSITE')
    original = llm.generate
    async def damaged(messages):
        data = json.loads(await original(messages))
        if '[BLOCK CheckOpposition]' in messages[0]['content']:
            if mutation == 'missing_evidence':
                del data['candidate_checks'][0]['replacement']['how']
            elif mutation == 'duplicate':
                data['candidate_checks'].append(deepcopy(data['candidate_checks'][0]))
            else:
                data['candidate_checks'][0]['exclusion_of_p0']['status'] = 'UNCERTAIN'
        return json.dumps(data)
    llm.generate = damaged
    with pytest.raises(BlockFailed):
        await build_world(GOAL, ctx(tmp_path, llm))
    assert 'FormContradiction' not in [b for b, _ in llm.calls]


@pytest.mark.asyncio
async def test_incomplete_comparison_cannot_skip_supplied_iterations(tmp_path):
    llm = ScriptedLLM()
    original = llm.generate
    async def incomplete(messages):
        data = json.loads(await original(messages))
        if '[BLOCK CompareDevelopment]' in messages[0]['content']:
            data['iterations_analyzed'] = []
        return json.dumps(data)
    llm.generate = incomplete
    with pytest.raises(BlockFailed):
        await build_world(GOAL, ctx(tmp_path, llm))


@pytest.mark.asyncio
async def test_comparison_cannot_replace_substantive_analysis_with_only_a_summary(tmp_path):
    llm = ScriptedLLM()
    original = llm.generate
    async def incomplete(messages):
        data = json.loads(await original(messages))
        if '[BLOCK CompareDevelopment]' in messages[0]['content']:
            data['development_steps'] = []
        return json.dumps(data)
    llm.generate = incomplete
    with pytest.raises(BlockFailed):
        await build_world(GOAL, ctx(tmp_path, llm))


@pytest.mark.asyncio
async def test_substantive_comparison_failure_keeps_reviewed_development(tmp_path):
    llm = ScriptedLLM()
    original = llm.generate
    async def unavailable(messages):
        data = json.loads(await original(messages))
        if '[BLOCK CompareDevelopment]' in messages[0]['content']:
            data = {'status': 'COMPARISON_FAILED', 'failure_reason': 'Insufficient comparison evidence'}
        return json.dumps(data)
    llm.generate = unavailable
    world = await build_world(GOAL, ctx(tmp_path, llm))
    assert world.stop_reason == 'comparison_not_established'
    assert len(world.iterations) == 1
    assert [b for b, _ in llm.calls].count('CompareDevelopment') == 1


@pytest.mark.asyncio
async def test_unsubstantiated_contradiction_is_partial_and_does_not_trigger_leap(tmp_path):
    llm = ScriptedLLM(opposition='OPPOSITE')
    original = llm.generate
    async def uncertain(messages):
        data = json.loads(await original(messages))
        if '[BLOCK FormContradiction]' in messages[0]['content']:
            data['contradictions'][0].update(status='CONTRADICTION_UNDETERMINED', uncertainty='Missing evidence')
        return json.dumps(data)
    llm.generate = uncertain
    world = await build_world(GOAL, ctx(tmp_path, llm))
    assert build_generation_result(world, 'run').status == 'partial'
    assert world.opposite is not None and world.contradiction is None
    assert 'ResolveLeap' not in [b for b, _ in llm.calls]
    assert [b for b, _ in llm.calls].count('FormContradiction') == 1
    assert 'Missing evidence' in json.dumps(build_generation_result(world, 'run').report)


@pytest.mark.asyncio
@pytest.mark.parametrize('fault', ['one_side_not_replaced', 'empty_derivation', 'mediation_confirmed'])
async def test_leap_contract_enforces_authored_substantive_fields(tmp_path, fault):
    llm = ScriptedLLM(opposition='OPPOSITE')
    original = llm.generate
    async def damaged(messages):
        data = json.loads(await original(messages))
        if '[BLOCK ResolveLeap]' in messages[0]['content']:
            if fault == 'empty_derivation':
                data['leap']['emerges_from_contradiction'] = ''
            elif fault == 'mediation_confirmed':
                data['previous_p0_status'] = 'CONFIRMED_P0'
            else:
                data.update(status='CONTRADICTION_RESOLVED', previous_p0_status='CONFIRMED_P0',
                            next_cycle={'candidate_p0': 'new', 'basis': 'RESULT_OF_LEAP'})
                data['leap'].update(type='REPLACEMENT', p0_content_transformed='p0 transformed',
                    opposite_content_transformed='opposite transformed', new_unity='new unity',
                    replacement={'replaces_p0': True, 'replaces_opposite': False, 'explanation': 'one side'})
        return json.dumps(data)
    llm.generate = damaged
    with pytest.raises(BlockFailed):
        await build_world(GOAL, ctx(tmp_path, llm))


@pytest.mark.asyncio
async def test_all_confirmed_opposites_have_their_own_contradiction_and_resolution(tmp_path):
    llm = ScriptedLLM(opposition='OPPOSITE')
    original = llm.generate
    async def two(messages):
        data = json.loads(await original(messages))
        prompt = messages[0]['content']
        if '[BLOCK BuildIteration]' in prompt:
            second = deepcopy(data['developing_processes'][0])
            second.update(id='P2', process='second process')
            second['basis']['current_iteration_processes'] = ['P1']
            data['developing_processes'].append(second)
            data['development_chain'].append('P2')
        elif '[BLOCK ReviewDevelopment]' in prompt:
            data['processes'].append({'id': 'P2', 'status': 'ACCEPT', 'reason': 'evidence', 'content': 'second explanation'})
        elif '[BLOCK CompareDevelopment]' in prompt:
            for field in ('opposition_candidates', 'development_steps', 'relations_to_p0'):
                second = deepcopy(data[field][0])
                second['process_ref'] = 'I1.P2'
                if field == 'development_steps':
                    second['development_base']['current_iteration_processes'] = ['I1.P1']
                data[field].append(second)
        elif '[BLOCK CheckOpposition]' in prompt:
            for field in ('candidate_checks', 'confirmed_opposites'):
                item = deepcopy(data[field][0])
                item['process_ref'] = 'I1.P2'
                data[field].append(item)
        elif '[BLOCK FormContradiction]' in prompt:
            data['contradictions'][0]['contradiction'] = 'relation for ' + data['contradictions'][0]['opposite_ref']
        return json.dumps(data)
    llm.generate = two
    world = await build_world(GOAL, ctx(tmp_path, llm))
    result = build_generation_result(world, 'run')
    assert len(world.branches) == 2
    for stage in (3, 4, 5):
        assert f'step{stage}.1' in result.updated_steps and f'step{stage}.2' in result.updated_steps
    assert 'I1.P2' in world.branches[1].contradiction.raw['contradiction']
    assert [b for b, _ in llm.calls].count('ResolveLeap') == 2
    for source in final_sources(world).values():
        assert isinstance(source, dict)


@pytest.mark.asyncio
async def test_presentation_receives_complete_reasoning_and_rejects_missing_cards(tmp_path):
    llm = ScriptedLLM(opposition='OPPOSITE')
    world = await build_world(GOAL, ctx(tmp_path, llm))
    keys = list(final_sources(world))
    calls = []
    async def render(messages):
        calls.append(messages[0]['content'])
        return json.dumps({'texts': {key: 'Connected prose for ' + key for key in keys}})
    llm.generate = render
    texts = await present(ctx(tmp_path, llm), world, keys)
    assert set(texts) == set(keys)
    prompt = calls[0]
    for evidence in ('replacement mechanism', 'practical unity', 'preservation', 'P0 preserved', 'opposite preserved'):
        assert evidence in prompt
    async def missing(messages):
        return '{"texts": {"step1": "only one"}}'
    llm.generate = missing
    with pytest.raises(BlockFailed):
        await present(ctx(tmp_path, llm), world, keys)


@pytest.mark.asyncio
async def test_legacy_single_step_uses_actual_predecessors_and_never_plans_future():
    from fastapi_app.services.ai_router_service import ConspectusRouter
    from fastapi_app.services.context_builder import ContextBuilder
    from fastapi_app.services.sanitizer import Sanitizer
    from test_ai_router_judge import _stage_ok_responses, _text_response
    calls = []
    async def generate(prompt, message='', *args, **kwargs):
        calls.append((prompt, message))
        assert 'REAL predecessor' in prompt
        assert 'FUTURE SECRET' not in prompt
        for marker, response in _stage_ok_responses('').items():
            if marker in message:
                return response
        return _text_response(message, 'generated')
    router = ConspectusRouter(MagicMock(_generate=AsyncMock(side_effect=generate)), ContextBuilder(), Sanitizer(), MagicMock())
    result = await router._handle_auto_step({'target_goal': 'topic', 'reference': 'source document', 'steps': {
        'step1': {'content': 'REAL predecessor'}, 'step5': {'content': 'FUTURE SECRET'}}}, 2, 'ru')
    assert result['status'] == 'completed'
    assert result['replace_bases'] == ['2']
    assert not any('Выполни Шаг 1' in message or 'Выполни Шаг 3' in message for _, message in calls)
    assert 'source document' in calls[0][0] and 'source document' in calls[1][0]


@pytest.mark.asyncio
async def test_authored_process_count_is_not_replaced_by_package_six_process_limit(tmp_path):
    from fastapi_app.services.generation.development import build_iteration
    llm = ScriptedLLM()
    original = llm.generate
    async def seven(messages):
        data = json.loads(await original(messages))
        first = data['developing_processes'][0]
        data['developing_processes'] = []
        for i in range(1, 8):
            item = deepcopy(first)
            item['id'] = f'P{i}'
            item['basis']['current_iteration_processes'] = [f'P{j}' for j in range(1, i)]
            data['developing_processes'].append(item)
        data['development_chain'] = ['P0'] + [f'P{i}' for i in range(1, 8)]
        return json.dumps(data)
    llm.generate = seven
    world = world_from_steps(GOAL, {'step1': {'content': 'P0'}}, 2)
    iteration = await build_iteration(ctx(tmp_path, llm), world, 1, None)
    assert len(iteration.developing) == 7 and len(llm.calls) == 1


@pytest.mark.asyncio
async def test_substantive_development_failure_is_not_retried_as_bad_json(tmp_path):
    llm = ScriptedLLM()
    original = llm.generate
    async def unavailable(messages):
        data = json.loads(await original(messages))
        if '[BLOCK BuildIteration]' in messages[0]['content']:
            data.update(status='DEVELOPMENT_FAILED', failure_reason='No substantive continuation', developing_processes=[])
        return json.dumps(data)
    llm.generate = unavailable
    world = await build_world(GOAL, ctx(tmp_path, llm))
    assert world.stop_reason == 'development_not_established'
    assert [b for b, _ in llm.calls].count('BuildIteration') == 1
    assert build_generation_result(world, 'run').status == 'partial'


@pytest.mark.asyncio
async def test_successful_single_p0_step_is_not_presented_as_confirmed_p0(tmp_path):
    world = await build_step(GOAL, ctx(tmp_path, ScriptedLLM()), {'steps': {}}, 1)
    assert world.status == 'built'
    assert final_sources(world)['step1']['p0_confirmed'] is False


@pytest.mark.asyncio
async def test_manual_step5_does_not_generate_a_missing_contradiction_branch(tmp_path):
    llm = ScriptedLLM(opposition='OPPOSITE')
    world = await build_world(GOAL, ctx(tmp_path, llm))
    world.branches[0].contradiction = None
    count = len(llm.calls)
    with pytest.raises(ValueError, match='шаг 4'):
        await contracts.finish_branches(ctx(tmp_path, llm), world, 5, '', preserve_predecessors=True)
    assert len(llm.calls) == count
