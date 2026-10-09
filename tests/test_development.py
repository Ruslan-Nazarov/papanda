"""Development explanations survive mapping; semantic rejection never becomes a card."""
import asyncio
import json
from copy import deepcopy

import pytest
from dialectic_world import Context, Settings
from dialectic_world.builder.blocks import BlockFailed
from dialectic_world.trace import Trace

from fastapi_app.services.generation.development import build_development, reader_rules, STYLE_PATH
from fastapi_app.services.generation.dialectic_v3_pipeline import build_generation_result
from fastapi_app.services.generation.scoped_dialectic_builder import ScopedWorld, build_world
from fastapi_app.services.generation.step_builder import build_step, world_from_steps
from tests.test_scoped_dialectic_builder import ScriptedLLM, GOAL


def context(tmp_path, llm):
    return Context(llm=llm, settings=Settings(prompt_language='en'), trace=Trace(tmp_path / 'trace.jsonl'))


def source_world():
    return world_from_steps(GOAL, {'step1': {'content': 'Original P0'}}, 2)


class ReviewLLM(ScriptedLLM):
    def __init__(self, verdicts=('ACCEPT',)):
        super().__init__()
        self.verdicts = verdicts
        self.review_count = 0

    async def generate(self, messages):
        prompt = messages[0]['content']
        if '[BLOCK BuildIteration]' in prompt:
            # A revision is still the same iteration, not the next one.
            self.iteration = int(prompt.split('CURRENT ITERATION NUMBER:')[1].strip().split()[0]) - 1
        data = json.loads(await super().generate(messages))
        if '[BLOCK ReviewDevelopment]' in prompt:
            verdict = self.verdicts[min(self.review_count, len(self.verdicts) - 1)]
            self.review_count += 1
            data['processes'][0].update(status=verdict,
                reason='Necessary external condition does not establish disclosure of P0',
                content='A concrete structural relation is explained in connected prose.' if verdict == 'ACCEPT' else '')
        return json.dumps(data)


def test_prose_rules_are_verbatim_without_old_engine_algorithm():
    rules = reader_rules()
    original = STYLE_PATH.read_text(encoding='utf-8')
    assert 'Механизм, а не перечень фактов' in rules
    assert 'Пишите для читателя, а не для алгоритма' in rules
    assert 'Шаг 2 — 2 или 3' not in rules
    assert 'кризис вычисления/записи' not in rules
    for section in rules.split('## ')[1:]:
        assert section.strip() in original


@pytest.mark.asyncio
async def test_single_step_renders_reviewed_explanation_and_preserves_engine_data(tmp_path):
    llm = ReviewLLM()
    world = await build_step(GOAL, context(tmp_path, llm), {'steps': {'step1': {'content': 'Original P0'}}}, 2)
    result = build_generation_result(world, 'run')
    assert result.updated_steps['step2.1']['content'] == 'A concrete structural relation is explained in connected prose.'
    assert world.iterations[0].raw['developing_processes'][0]['development_relation'] == 'relation'
    assert world.get(world.iterations[0].developing[0]).statement == 'development 1'
    prompt = next(p for block, p in llm.calls if block == 'ReviewDevelopment')
    for field in ('development_relation', 'reveals', 'practical_significance', 'basis'):
        assert field in prompt
    assert 'structural, spatial' in prompt
    assert 'Механизм, а не перечень фактов' in prompt
    restored = ScopedWorld.model_validate_json(world.model_dump_json())
    assert build_generation_result(restored, 'restored').updated_steps == result.updated_steps
    assert result.report['development_reviews'][0]['processes'][0]['status'] == 'ACCEPT'


@pytest.mark.asyncio
async def test_rejection_rebuilds_same_iteration_with_evidence(tmp_path):
    llm = ReviewLLM(('REJECT', 'ACCEPT'))
    world = source_world()
    iteration = await build_development(context(tmp_path, llm), world, 1, None)
    world.iterations.append(iteration)
    assert [b for b, _ in llm.calls] == ['BuildIteration', 'ReviewDevelopment'] * 2
    builds = [p for b, p in llm.calls if b == 'BuildIteration']
    assert 'Necessary external condition' in builds[1]
    assert 'rejected_iteration' in builds[1]
    assert len(world.processes) == 2  # no orphan from the rejected build
    assert len(world.development_texts) == 1 and len(world.development_reviews) == 2
    assert iteration.n == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('verdict', ['REJECT', 'UNDETERMINED'])
async def test_failed_review_never_exports_candidate_or_continues_to_opposition(tmp_path, verdict):
    llm = ReviewLLM((verdict,))
    world = source_world()
    before = deepcopy(world.processes)
    with pytest.raises(ValueError, match='содержательную проверку'):
        await build_development(context(tmp_path, llm), world, 1, None)
    assert world.processes == before
    assert not world.development_texts and not world.iterations
    assert len(llm.calls) == 4
    assert not any(key.startswith('step2') for key in build_generation_result(world, 'run').updated_steps)


@pytest.mark.asyncio
@pytest.mark.parametrize('fault', ['missing', 'duplicate', 'wrong_id', 'empty_content', 'empty_reason', 'string_bool'])
async def test_malformed_review_cannot_bypass_gate(tmp_path, fault):
    llm = ReviewLLM()
    original = llm.generate

    async def malformed(messages):
        data = json.loads(await original(messages))
        if '[BLOCK ReviewDevelopment]' in messages[0]['content']:
            item = data['processes'][0]
            if fault == 'missing':
                data['processes'] = []
            elif fault == 'duplicate':
                data['processes'].append(item.copy())
            elif fault == 'wrong_id':
                item['id'] = 'P2'
            elif fault == 'empty_content':
                item['content'] = ' '
            elif fault == 'empty_reason':
                item['reason'] = None
            else:
                item['status'] = 'true'
        return json.dumps(data)

    llm.generate = malformed
    world = source_world()
    with pytest.raises(BlockFailed):
        await build_development(context(tmp_path, llm), world, 1, None)
    assert len(world.processes) == 1 and not world.development_texts


@pytest.mark.asyncio
async def test_full_build_reviews_every_iteration_before_comparison(tmp_path):
    llm = ReviewLLM()
    world = await build_world(GOAL, context(tmp_path, llm))
    assert [b for b, _ in llm.calls] == ['FindP0', 'CheckScope'] + [
        'BuildIteration', 'ReviewDevelopment', 'CompareDevelopment'] * 3
    assert len(world.development_texts) == 3
    assert len(build_generation_result(world, 'run').updated_steps) == 4


@pytest.mark.asyncio
async def test_cancellation_during_review_does_not_commit_candidate(tmp_path):
    llm = ReviewLLM()
    original = llm.generate

    async def cancel(messages):
        if '[BLOCK ReviewDevelopment]' in messages[0]['content']:
            raise asyncio.CancelledError()
        return await original(messages)

    llm.generate = cancel
    world = source_world()
    with pytest.raises(asyncio.CancelledError):
        await build_development(context(tmp_path, llm), world, 1, None)
    assert len(world.processes) == 1 and not world.development_texts


@pytest.mark.asyncio
async def test_one_rejected_process_blocks_the_whole_candidate_iteration(tmp_path):
    llm = ReviewLLM()
    original = llm.generate

    async def mixed(messages):
        data = json.loads(await original(messages))
        if '[BLOCK BuildIteration]' in messages[0]['content']:
            second = deepcopy(data['developing_processes'][0])
            second['id'] = 'P2'
            second['basis']['current_iteration_processes'] = ['P1']
            data['developing_processes'].append(second)
            data['development_chain'].append('P2')
        elif '[BLOCK ReviewDevelopment]' in messages[0]['content']:
            data['processes'].append({'id': 'P2', 'status': 'REJECT',
                                     'reason': 'Mere enumeration', 'content': ''})
        return json.dumps(data)

    llm.generate = mixed
    world = source_world()
    with pytest.raises(ValueError, match='Mere enumeration'):
        await build_development(context(tmp_path, llm), world, 1, None)
    assert len(world.processes) == 1 and not world.development_texts


@pytest.mark.asyncio
async def test_failed_semantic_review_returns_failed_terminal_without_cards(monkeypatch, tmp_path):
    from fastapi_app.services.generation import dialectic_v3_pipeline as pipeline

    async def rejected(domain, ctx, state, target):
        return await build_step(domain, context(tmp_path, ReviewLLM(('REJECT',))), state, target)

    monkeypatch.setattr(pipeline, 'build_step', rejected)
    monkeypatch.setattr(pipeline, 'build_llm', lambda _: object())
    monkeypatch.setattr(pipeline.conspect_settings, 'GROQ_API_KEY', 'fixture')
    events = [event async for event in pipeline.DialecticV3Pipeline().stream_generate_full(
        {'target_goal': GOAL, 'steps': {'step1': {'content': 'Original P0'}}},
        'ru', target_step=2, source_revision=9)]
    result = events[-1][1]
    assert result['status'] == 'failed' and result['updated_steps'] == {}
    assert result['source_revision'] == 9
    assert 'содержательную проверку' in result['error_message']


@pytest.mark.asyncio
async def test_review_budget_failure_propagates_without_committing_candidate(tmp_path):
    from fastapi_app.services.generation.runtime import BudgetExceeded
    llm = ReviewLLM()
    original = llm.generate

    async def exhausted(messages):
        if '[BLOCK ReviewDevelopment]' in messages[0]['content']:
            raise BudgetExceeded('call_budget', 'No calls left for review')
        return await original(messages)

    llm.generate = exhausted
    world = source_world()
    with pytest.raises(BudgetExceeded):
        await build_development(context(tmp_path, llm), world, 1, None)
    assert len(world.processes) == 1 and not world.development_texts


def test_legacy_snapshot_keeps_each_process_explanation_in_its_own_card():
    from tests.test_dialectic_v3_pipeline import _built_world
    world = _built_world()
    world.iterations[0].raw['developing_processes'] = [
        {'id': f'P{i}', 'process': f'label {i}', 'development_relation': f'connection {i}',
         'reveals': f'disclosure {i}', 'practical_significance': f'observation {i}'} for i in range(1, 6)]
    result = build_generation_result(world, 'run')
    assert result.updated_steps['step2.2']['content'] == 'развивающий 2\n\nconnection 2\n\ndisclosure 2\n\nobservation 2'
    assert 'connection 1' not in result.updated_steps['step2.2']['content']
