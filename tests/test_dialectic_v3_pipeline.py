"""The dialectic_world v3 engine adapter: World -> GenerationResult mapping, and the asyncio bridge
from build_world()'s on_event callback into stream_generate_full's async-generator contract.
No live model calls: build_generation_result is tested directly on hand-built World objects, and the
bridge is tested with build_world() monkeypatched to a fast fake."""
import asyncio

import pytest
from dialectic_world.world.model import Contradiction, IterationRecord, Process, Resolution, World

from fastapi_app.services.generation import dialectic_v3_pipeline as pipeline_module
from fastapi_app.services.generation.dialectic_v3_pipeline import DialecticV3Pipeline, build_generation_result


@pytest.fixture(autouse=True)
def no_live_presentation(monkeypatch):
    async def present(ctx, world, keys):
        return {}
    monkeypatch.setattr(pipeline_module, 'present', present)


def _process(pid, role, statement, iteration=0):
    return Process(id=pid, source="", target="", statement=statement, role=role, iteration=iteration)


def _built_world(status="built", resolution_kind="replacement"):
    w = World(domain="тест")
    p0 = _process("P0", "p0", "простейший процесс")
    w.add(p0)
    w.p0 = p0
    w.p0_explanation = {"practical_link": "связь", "why_initial": "почему", "resolution_trace": "разрешение",
                        "development_potential": "потенциал"}
    d1, d2, d3, d4, d5 = (_process(f"P{i}", "developing", f"развивающий {i}", iteration=1) for i in range(1, 6))
    for d in (d1, d2, d3, d4, d5):
        w.add(d)
    w.iterations = [IterationRecord(n=1, based_on_iteration=None, developing=[d.id for d in (d1, d2, d3, d4, d5)],
                                    p0_revealed_content="раскрыто", iteration_practical_integrity="целостно",
                                    raw={})]
    if status in ("built", "mediated", "leap_not_found", "failed"):
        opp = _process("PO", "developing", "противоположный", iteration=1)
        w.add(opp)
        w.opposite = opp
        w.opposite_explanation = {"shared_content_with_p0": "общее", "difference_from_p0": "отличие",
                                  "exclusion_of_p0": "исключение"}
    if status in ("built", "mediated", "leap_not_found", "failed"):
        c = _process("C1", "contradiction", "противоречие")
        w.add(c)
        w.contradiction = Contradiction(process_id=c.id, unity="единство", raw={})
    if status in ("built", "mediated"):
        r = _process("R1", "resolution", "разрешение")
        w.add(r)
        w.resolution = Resolution(process_id=r.id, kind=resolution_kind, explanation="объяснение", raw={})
    w.status = status
    return w


@pytest.mark.parametrize("world_status,resolution_kind,expected", [
    ("built", "replacement", "completed"),
    ("mediated", "mediation", "completed"),
    ("leap_not_found", "replacement", "partial"),
    ("no_opposite", "replacement", "partial"),
    ("no_p0", "replacement", "not_applicable"),
    ("failed", "replacement", "failed"),
])
def test_status_mapping(world_status, resolution_kind, expected):
    world = _built_world(status=world_status, resolution_kind=resolution_kind)
    result = build_generation_result(world, "run1")
    assert result.status == expected


def test_full_build_preserves_every_developing_process():
    world = _built_world(status="built")
    result = build_generation_result(world, "run1")
    assert set(result.updated_steps) == {"step1", "step2.1", "step2.2", "step2.3", "step2.4", "step2.5", "step3", "step4", "step5"}
    assert "простейший процесс" in result.updated_steps["step1"]["content"]
    assert result.updated_steps["step1"]["author"] == "ai" and result.updated_steps["step1"]["status"] == "in_progress"
    assert "развивающий 5" in str(result.updated_steps)
    assert "противоположный" in result.updated_steps["step3"]["content"]
    assert result.replace_bases == ["1", "2", "3", "4", "5"]


def test_no_p0_world_has_no_steps():
    world = World(domain="тест", status="no_p0")
    result = build_generation_result(world, "run1")
    assert result.updated_steps == {}


def test_all_iterations_survive_document_mapping():
    world = _built_world()
    extra = _process('P6', 'developing', 'second iteration', iteration=2)
    world.add(extra)
    world.iterations.append(IterationRecord(n=2, based_on_iteration=1, developing=['P6'],
        p0_revealed_content='more', iteration_practical_integrity='complete', raw={}))
    result = build_generation_result(world, 'run1')
    assert result.updated_steps['step2.1']['content'] == 'развивающий 1'
    assert result.updated_steps['step2.6']['content'] == 'second iteration'


@pytest.mark.asyncio
async def test_step_proposal_preserves_other_families_and_supplies_context(monkeypatch):
    seen = {}
    async def build(domain, ctx, supplied_state, target):
        assert target == 2
        assert supplied_state['steps']['step1']['content'] == 'original'
        seen.update(ctx.llm.context)
        return _built_world()
    monkeypatch.setattr(pipeline_module, 'build_step', build)
    async def forbidden(*args):
        raise AssertionError('A single step must not build the whole world')
    monkeypatch.setattr(pipeline_module, 'build_world', forbidden)
    monkeypatch.setattr(pipeline_module, 'build_llm', lambda spec: object())
    monkeypatch.setattr(pipeline_module.conspect_settings, 'GROQ_API_KEY', 'fixture')
    from fastapi_app.routers.ai import GenerationInput
    state = GenerationInput.model_validate({'target_goal': 'topic', 'reference': 'document', 'steps': {
        'step1': {'content': 'original', 'title': 'ECG measurement',
                  'stickers': [{'title': 'Development', 'text': 'Specific electrodes and frequency'}]},
    }}).model_dump()
    events = [event async for event in DialecticV3Pipeline().stream_generate_full(
        state, 'en', target_step=2, pinned_step='2', question='clarify')]
    result = events[-1][1]
    assert result['replace_bases'] == ['2']
    assert all(key.startswith('step2.') for key in result['updated_steps'])
    assert seen['reference_document'] == 'document' and seen['user_question'] == 'clarify'
    assert seen['existing_note_steps'] == {key: {field: value for field, value in step.items()
        if field != 'generation_data'} for key, step in state['steps'].items()}


@pytest.mark.asyncio
async def test_empty_topic_short_circuits_without_calling_build_world(monkeypatch):
    async def should_not_run(*a, **kw):
        raise AssertionError("build_world should not be called for an empty topic")
    monkeypatch.setattr(pipeline_module, "build_world", should_not_run)
    events = [e async for e in DialecticV3Pipeline().stream_generate_full({"target_goal": "  "}, "ru")]
    assert len(events) == 1 and events[0][0] == "__terminal__"
    assert events[0][1]["status"] == "not_applicable"


@pytest.mark.asyncio
async def test_events_stream_then_terminal(monkeypatch):
    async def fake_build_world(domain, ctx):
        assert domain == "фотосинтез"
        await ctx.on_event("FindP0", {})
        await asyncio.sleep(0)
        await ctx.on_event("BuildIteration", {})
        return _built_world(status="built")
    monkeypatch.setattr(pipeline_module, "build_world", fake_build_world)
    monkeypatch.setattr(pipeline_module, "build_llm", lambda spec: object())
    monkeypatch.setattr(pipeline_module.conspect_settings, "GROQ_API_KEY", "fake-key", raising=False)

    events = [e async for e in DialecticV3Pipeline().stream_generate_full({"target_goal": "фотосинтез"}, "ru")]
    kinds = [k for k, _ in events]
    assert kinds[-1] == "__terminal__"
    assert kinds.count("__status__") == 3
    assert events[0] == ("__status__", {"phase": "planning"})
    assert events[1] == ("__status__", {"phase": "generating"})
    assert events[2] == ("__status__", {"phase": "postprocess"})
    assert events[-1][1]["status"] == "completed"


@pytest.mark.asyncio
async def test_build_world_exception_yields_failed_terminal_not_a_raise(monkeypatch):
    async def failing_build_world(domain, ctx):
        raise RuntimeError("boom")
    monkeypatch.setattr(pipeline_module, "build_world", failing_build_world)
    monkeypatch.setattr(pipeline_module, "build_llm", lambda spec: object())
    monkeypatch.setattr(pipeline_module.conspect_settings, "GROQ_API_KEY", "fake-key", raising=False)

    events = [e async for e in DialecticV3Pipeline().stream_generate_full({"target_goal": "тема"}, "ru")]
    assert events[-1][0] == "__terminal__"
    assert events[-1][1]["status"] == "failed"
    assert "boom" in events[-1][1]["error_message"]


_KEYS = ("OPENAI_API_KEY", "GIGACHAT_AUTH_KEY", "GROQ_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY")


def _set_keys(monkeypatch, **present):
    for key in _KEYS:
        monkeypatch.setattr(pipeline_module.conspect_settings, key, present.get(key, ""), raising=False)


def test_provider_chain_order_and_skips_unset_keys(monkeypatch):
    _set_keys(monkeypatch, OPENAI_API_KEY="k", GIGACHAT_AUTH_KEY="k", GROQ_API_KEY="k", CEREBRAS_API_KEY="k",
              OPENROUTER_API_KEY="k")
    spec = pipeline_module._builder_model_spec().split(",")
    assert [s.split(":")[0] for s in spec] == ["openai", "gigachat", "groq", "cerebras", "openrouter"]
    assert spec[0] == "openai:gpt-5-mini"
    _set_keys(monkeypatch, GROQ_API_KEY="k", GIGACHAT_AUTH_KEY="k")
    assert [s.split(":")[0] for s in pipeline_module._builder_model_spec().split(",")] == ["gigachat", "groq"]


def test_gigachat_credentials_are_bridged_under_the_name_dialectic_world_reads(monkeypatch):
    import os
    for name in ("GIGACHAT_CREDENTIALS", "GIGACHAT_SCOPE", "GIGACHAT_CA_BUNDLE"):
        monkeypatch.delenv(name, raising=False)
    _set_keys(monkeypatch, GIGACHAT_AUTH_KEY="secret-auth")
    monkeypatch.setattr(pipeline_module.conspect_settings, "GIGACHAT_SCOPE", "GIGACHAT_API_PERS", raising=False)
    monkeypatch.setattr(pipeline_module.conspect_settings, "GIGACHAT_CA_BUNDLE", "data/certs/ca.pem", raising=False)
    pipeline_module._ensure_api_keys_in_environ()
    assert os.environ["GIGACHAT_CREDENTIALS"] == "secret-auth"
    assert os.environ["GIGACHAT_SCOPE"] == "GIGACHAT_API_PERS"
    assert os.path.isabs(os.environ["GIGACHAT_CA_BUNDLE"]) and os.environ["GIGACHAT_CA_BUNDLE"].endswith("ca.pem")
    for name in ("GIGACHAT_CREDENTIALS", "GIGACHAT_SCOPE", "GIGACHAT_CA_BUNDLE"):
        os.environ.pop(name, None)


def test_no_provider_configured_raises(monkeypatch):
    _set_keys(monkeypatch)
    with pytest.raises(RuntimeError):
        pipeline_module._builder_model_spec()


@pytest.mark.asyncio
@pytest.mark.parametrize("locale,user_request", [("ru", "The Pythagorean theorem"), ("en", "Теорема Пифагора"),
                                         ("en", "Пифагор теоремасын түсіндір"), ("ru", "Explain photosynthesis")])
async def test_answer_language_follows_request_not_interface(monkeypatch, locale, user_request):
    seen = {}

    class RecordingSettings:
        def __init__(self, **kw):
            seen.update(kw)

    async def fake_build_world(domain, ctx):
        assert ctx.llm.original_request == user_request
        assert ctx.llm.output_language is None
        return _built_world(status="built")
    monkeypatch.setattr(pipeline_module, "DialecticSettings", RecordingSettings)
    monkeypatch.setattr(pipeline_module, "build_world", fake_build_world)
    monkeypatch.setattr(pipeline_module, "build_llm", lambda spec: object())
    monkeypatch.setattr(pipeline_module.conspect_settings, "GROQ_API_KEY", "fake-key", raising=False)

    _ = [e async for e in DialecticV3Pipeline().stream_generate_full({"target_goal": user_request}, locale)]
    assert seen["prompt_language"] == "en"
    assert seen["output_language"] == pipeline_module._OUTPUT_LANGUAGE


def test_step_labels_follow_locale():
    world = _built_world(status="built")
    ru = build_generation_result(world, "r", "ru").updated_steps["step1"]["content"]
    en = build_generation_result(world, "r", "en").updated_steps["step1"]["content"]
    assert "Практическая связь" in ru and "Practical link" in en


@pytest.mark.asyncio
async def test_terminal_result_carries_the_transports_run_id(monkeypatch):
    from fastapi_app.services.generation.runtime import GenerationContext, current_run

    async def fake_build_world(domain, ctx):
        return _built_world(status="built")
    monkeypatch.setattr(pipeline_module, "build_world", fake_build_world)
    monkeypatch.setattr(pipeline_module, "build_llm", lambda spec: object())
    monkeypatch.setattr(pipeline_module.conspect_settings, "GROQ_API_KEY", "fake-key", raising=False)

    context = GenerationContext()
    token = current_run.set(context)
    try:
        events = [e async for e in DialecticV3Pipeline().stream_generate_full({"target_goal": "тема"}, "ru")]
    finally:
        current_run.reset(token)
    assert events[-1][1]["run_id"] == context.run_id


@pytest.mark.asyncio
async def test_source_revision_is_echoed_in_every_kind_of_terminal_result(monkeypatch):
    async def ok(domain, ctx):
        return _built_world(status="built")

    async def boom(domain, ctx):
        raise RuntimeError("boom")
    monkeypatch.setattr(pipeline_module, "build_llm", lambda spec: object())
    monkeypatch.setattr(pipeline_module.conspect_settings, "GROQ_API_KEY", "fake-key", raising=False)
    for build, topic in ((ok, "тема"), (boom, "тема"), (ok, "")):
        monkeypatch.setattr(pipeline_module, "build_world", build)
        events = [e async for e in DialecticV3Pipeline().stream_generate_full(
            {"target_goal": topic}, "ru", source_revision=7)]
        assert events[-1][1]["source_revision"] == 7


@pytest.mark.asyncio
async def test_generated_world_and_trace_are_kept_for_inspection(monkeypatch, tmp_path):
    async def fake_build_world(domain, ctx):
        ctx.trace.event("block", block="FindP0")
        return _built_world(status="built")
    monkeypatch.setattr(pipeline_module, "build_world", fake_build_world)
    monkeypatch.setattr(pipeline_module, "build_llm", lambda spec: object())
    monkeypatch.setattr(pipeline_module.conspect_settings, "GROQ_API_KEY", "fake-key", raising=False)
    monkeypatch.setattr(pipeline_module.conspect_settings, "DATA_DIR", tmp_path, raising=False)

    events = [e async for e in DialecticV3Pipeline().stream_generate_full({"target_goal": "тема"}, "ru")]
    run_id = events[-1][1]["run_id"]
    assert (tmp_path / "dialectic_v3_runs" / f"{run_id}.json").exists()
    assert (tmp_path / "dialectic_v3_runs" / f"{run_id}.jsonl").exists()


@pytest.mark.asyncio
async def test_target_annotations_are_supplied_without_future_steps_or_changing_request_language(monkeypatch):
    seen = {}
    async def build(domain, ctx, state, target):
        seen.update(ctx.llm.context)
        assert ctx.llm.original_request == 'Explain a structural relation'
        assert ctx.llm.clarification == 'Подробнее'
        return _built_world()
    monkeypatch.setattr(pipeline_module, 'build_step', build)
    monkeypatch.setattr(pipeline_module, 'build_llm', lambda spec: object())
    monkeypatch.setattr(pipeline_module.conspect_settings, 'GROQ_API_KEY', 'fixture')
    state = {'target_goal': 'Explain a structural relation', 'reference': 'DOCUMENT', 'steps': {
        'step1': {'content': 'previous'},
        'step2': {'content': 'current version', 'title': 'current heading',
                  'stickers': [{'title': 'requirement', 'text': 'preserve this nuance'}]},
        'step5': {'content': 'FUTURE TEXT MUST NOT LEAK'},
    }}
    events = [e async for e in DialecticV3Pipeline().stream_generate_full(state, 'ru', target_step=2, question='Подробнее')]
    assert seen['step_to_revise'] == {'step2': state['steps']['step2']}
    assert seen['existing_note_steps'] == {'step1': state['steps']['step1']}
    assert 'FUTURE TEXT' not in str(seen)
    from fastapi_app.services.generation.note_context import source_signature, prompt_signature
    result = events[-1][1]
    data = next(v['generation_data'] for v in result['updated_steps'].values() if 'generation_data' in v)
    assert data['source_signature'] == source_signature(state['target_goal'], 'DOCUMENT')
    assert data['prompt_signature'] == prompt_signature()
