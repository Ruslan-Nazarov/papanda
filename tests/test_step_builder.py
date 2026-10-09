import pytest
from dialectic_world import Context, Settings
from dialectic_world.trace import Trace
from fastapi_app.services.generation.step_builder import build_step, world_from_steps
from fastapi_app.services.generation.note_context import prompt_signature
from tests.test_scoped_dialectic_builder import ScriptedLLM, GOAL


def state(target):
    return {'steps': {f'step{i}': {'content': f'User text {i}'} for i in range(1, target)}}


@pytest.mark.asyncio
@pytest.mark.parametrize('target,expected', [
    (1, ['FindP0', 'CheckScope']), (2, ['BuildIteration', 'ReviewDevelopment']),
    (3, ['CompareDevelopment', 'CheckOpposition']),
    (4, ['CheckOpposition', 'FormContradiction']),
    (5, ['CheckOpposition', 'FormContradiction', 'ResolveLeap']),
])
async def test_each_step_calls_only_its_own_stages(tmp_path, target, expected):
    llm = ScriptedLLM(opposition='OPPOSITE')
    # This fake's comparison response refers to iteration 1, supplied by step 2.
    if target == 3:
        llm.iteration = 1
    ctx = Context(llm=llm, settings=Settings(prompt_language='en'), trace=Trace(tmp_path / 'trace.jsonl'))
    supplied = state(target)
    supplied['steps']['step5'] = {'content': 'FUTURE CONTENT MUST NOT BE USED'}
    world = await build_step(GOAL, ctx, supplied, target)
    assert world.status in ('built', 'mediated')
    assert [block for block, _ in llm.calls] == expected
    for _, prompt in llm.calls:
        assert 'FUTURE CONTENT MUST NOT BE USED' not in prompt
        for i in range(1, target):
            assert f'User text {i}' in prompt


@pytest.mark.asyncio
async def test_missing_predecessor_stops_without_any_model_call(tmp_path):
    llm = ScriptedLLM()
    ctx = Context(llm=llm, trace=Trace(tmp_path / 'trace.jsonl'))
    with pytest.raises(ValueError, match='шаг 1'):
        await build_step(GOAL, ctx, {'steps': {}}, 2)
    assert llm.calls == []


def test_manual_edits_override_saved_structured_data():
    steps = state(3)['steps']
    old = world_from_steps(GOAL, steps, 3)
    steps['step2']['generation_data'] = {'world': old.model_dump(),
        'dependencies': {key: value['content'] for key, value in steps.items()}}
    steps['step1']['content'] = 'MANUALLY REVISED P0'
    hydrated = world_from_steps(GOAL, steps, 3)
    assert hydrated.p0.statement == 'MANUALLY REVISED P0'


def test_unchanged_predecessors_reuse_structured_results_without_future_stages():
    steps = state(3)['steps']
    original = world_from_steps(GOAL, steps, 3)
    original.p0_explanation = {'practical_link': 'preserved structure'}
    steps['step2']['generation_data'] = {'world': original.model_dump(), 'prompt_signature': prompt_signature(),
        'dependencies': {key: value['content'] for key, value in steps.items()}}
    hydrated = world_from_steps(GOAL, steps, 3)
    assert hydrated.p0_explanation == original.p0_explanation
    assert hydrated.opposite is None and hydrated.resolution is None


@pytest.mark.parametrize('change', ['title', 'sticker_title', 'sticker_text', 'remove_sticker', 'legacy'])
def test_annotation_changes_invalidate_structured_results(change):
    from copy import deepcopy
    steps = state(2)['steps']
    steps['step1'].update(title='ECG measurement', stickers=[{'title': 'Development', 'text': 'Specific frequency'}])
    original = world_from_steps(GOAL, steps, 2)
    original.p0_explanation = {'practical_link': 'old structured interpretation'}
    data = {'world': original.model_dump(), 'prompt_signature': prompt_signature(), 'dependencies': {'step1': steps['step1']['content']},
        'context_dependencies': {'step1': {'title': steps['step1']['title'], 'stickers': deepcopy(steps['step1']['stickers'])}}}
    steps['step1']['generation_data'] = data
    assert world_from_steps(GOAL, steps, 2).p0_explanation == original.p0_explanation
    if change == 'title':
        steps['step1']['title'] = 'Revised heading'
    elif change == 'sticker_title':
        steps['step1']['stickers'][0]['title'] = 'Revised purpose'
    elif change == 'sticker_text':
        steps['step1']['stickers'][0]['text'] = 'Revised frequency'
    elif change == 'remove_sticker':
        steps['step1']['stickers'] = []
    else:
        del data['context_dependencies']
    assert world_from_steps(GOAL, steps, 2).p0_explanation == {}


@pytest.mark.asyncio
async def test_next_step_prompt_contains_heading_and_sticker_meanings(tmp_path):
    from fastapi_app.routers.ai import GenerationInput
    supplied = GenerationInput.model_validate({'steps': {'step1': {
        'content': 'Measuring the ECG signal', 'title': 'Measurement requires an instrument',
        'stickers': [{'title': 'For developing processes', 'text': 'Specific electrodes for a specific frequency'}],
    }}}).model_dump()
    llm = ScriptedLLM()
    ctx = Context(llm=llm, settings=Settings(prompt_language='en'), trace=Trace(tmp_path / 'trace.jsonl'))
    await build_step(GOAL, ctx, supplied, 2)
    for _, prompt in llm.calls:
        assert 'Measurement requires an instrument' in prompt
        assert 'For developing processes' in prompt
        assert 'Specific electrodes for a specific frequency' in prompt


@pytest.mark.asyncio
async def test_metadata_with_future_content_never_enters_model_prompt(tmp_path):
    supplied = state(2)
    world = world_from_steps(GOAL, supplied['steps'], 2)
    world.rejected_p0 = [{'reason': 'SECRET FUTURE TEXT'}]
    supplied['steps']['step1']['generation_data'] = {'world': world.model_dump(),
        'dependencies': {'step1': 'User text 1'}}
    llm = ScriptedLLM()
    ctx = Context(llm=llm, settings=Settings(prompt_language='en'), trace=Trace(tmp_path / 'trace.jsonl'))
    await build_step(GOAL, ctx, supplied, 2)
    assert all('SECRET FUTURE TEXT' not in prompt for _, prompt in llm.calls)
