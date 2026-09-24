import asyncio
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock

import pytest

from fastapi_app.services.generation.provider_adapter import record_response
from fastapi_app.services.generation.routing import route_for
from fastapi_app.services.generation.runtime import GenerationContext, GenerationError, BudgetExceeded, generation_scope
from fastapi_app.services.llm_provider import BaseLLMProvider, LLMRegistry, get_last_call_info


class FakeProvider:
    def __init__(self, name='A', model='model-a', responses=('ok',), chunks=('ok',)):
        self.name, self.model_name, self.fast_model_name = name, model, model
        self.api_key = 'test-only'
        self.responses, self.chunks = list(responses), list(chunks)
        self.calls = 0
        self.closed = False

    async def generate(self, *a, **kw):
        self.calls += 1
        result = self.responses[min(self.calls - 1, len(self.responses) - 1)]
        if isinstance(result, Exception):
            raise result
        record_response(NS(model=self.model_name, usage=NS(total_tokens=17)))
        return result

    async def generate_stream(self, *a, **kw):
        self.calls += 1
        try:
            for chunk in self.chunks:
                if isinstance(chunk, Exception):
                    raise chunk
                yield chunk
        finally:
            self.closed = True


def registry(*providers):
    value = object.__new__(LLMRegistry)
    value.providers, value._start_idx = list(providers), 0
    return value


@pytest.mark.asyncio
async def test_fallback_shares_call_and_token_budget_and_records_actual_usage():
    a, b = FakeProvider(responses=(RuntimeError('failed'),)), FakeProvider('B', 'model-b')
    reg = registry(a, b)
    context = GenerationContext(max_calls=2)
    async with generation_scope(context):
        assert await reg.generate([], max_tokens=20) == 'ok'
        with pytest.raises(BudgetExceeded, match='call budget'):
            await reg.generate([], max_tokens=20)
    assert a.calls == b.calls == 1
    assert [c['status'] for c in context.calls] == ['failed', 'completed']
    assert context.metrics()['usage_tokens'] == 17
    assert context.metrics()['usage_complete'] is False
    assert context.tokens_reserved == 44


@pytest.mark.asyncio
async def test_token_admission_prevents_request():
    provider = FakeProvider()
    async with generation_scope(GenerationContext(max_tokens=10)):
        with pytest.raises(BudgetExceeded, match='token budget'):
            await registry(provider).generate([], max_tokens=20)
    assert provider.calls == 0


@pytest.mark.asyncio
async def test_format_fallback_is_counted():
    error = RuntimeError('unsupported format')
    error.status_code = 400
    provider = FakeProvider(responses=(error, 'ok'))
    context = GenerationContext(max_calls=2)
    async with generation_scope(context):
        assert await registry(provider).generate([], {'type': 'json_object'}) == 'ok'
    assert len(context.calls) == provider.calls == 2


@pytest.mark.asyncio
async def test_rate_limit_backoff_is_inside_shared_deadline():
    error = RuntimeError('rate limit')
    error.status_code = 429
    provider = FakeProvider(responses=(error,))
    with pytest.raises(BudgetExceeded, match='deadline'):
        async with generation_scope(GenerationContext(deadline_seconds=0.02)):
            await registry(provider).generate([])
    assert provider.calls == 1


@pytest.mark.asyncio
async def test_allowed_list_and_model_identity_apply_to_fallback():
    a, b, c = FakeProvider('Groq', 'openai/gpt-oss-120b'), FakeProvider('Cerebras', 'gpt-oss-120b'), FakeProvider('Other', 'different')
    reg = registry(a, b, c)
    with pytest.raises(GenerationError):
        await reg.generate([], prefer=route_for('judge', allowed=['Groq', 'Cerebras'], exclude_models=['gpt-oss-120b']))
    assert a.calls == b.calls == c.calls == 0
    assert await reg.generate([], prefer=route_for(prefer=['Groq'], allowed=['Other'])) == 'ok'
    assert c.calls == 1


@pytest.mark.asyncio
async def test_provider_returning_excluded_actual_model_is_rejected():
    class Aliased(FakeProvider):
        async def generate(self, *a, **kw):
            record_response(NS(model='same-model', usage=NS(total_tokens=10)))
            return 'judge says yes'
    context = GenerationContext()
    async with generation_scope(context):
        with pytest.raises(GenerationError):
            await registry(Aliased(model='alias')).generate([], prefer=route_for(exclude_models=['same-model']))
    assert context.calls[0]['status'] == 'rejected_model'


@pytest.mark.asyncio
async def test_partial_stream_never_falls_back_and_is_closed():
    a, b = FakeProvider(chunks=('partial', RuntimeError('broken'))), FakeProvider('B')
    chunks = []
    with pytest.raises(GenerationError, match='interrupted'):
        async for chunk in registry(a, b).generate_stream([]):
            chunks.append(chunk)
    assert chunks == ['partial']
    assert b.calls == 0
    assert a.closed


@pytest.mark.asyncio
async def test_stream_can_fallback_before_first_chunk():
    a, b = FakeProvider(chunks=(RuntimeError('broken'),)), FakeProvider('B', chunks=('complete',))
    assert [c async for c in registry(a, b).generate_stream([])] == ['complete']
    assert get_last_call_info()['fell_back'] is True


class SDKStream:
    def __init__(self, chunks):
        self.chunks = chunks
        self.closed = False
    async def __aenter__(self):
        return self
    async def __aexit__(self, *a):
        self.closed = True
    def __aiter__(self):
        return self.iterate()
    async def iterate(self):
        for text, finish in self.chunks:
            yield NS(choices=[NS(delta=NS(content=text), finish_reason=finish)], model='model', usage=None)


@pytest.mark.asyncio
@pytest.mark.parametrize('chunks', [[('text', None)], [('text', 'length')], [('text', 'content_filter')]])
async def test_sdk_stream_requires_successful_finish(chunks):
    stream = SDKStream(chunks)
    client = NS(chat=NS(completions=NS(create=AsyncMock(return_value=stream))))
    provider = BaseLLMProvider('test', 'http://unused', 'model', 'A', client=client)
    with pytest.raises(GenerationError):
        _ = [c async for c in provider.generate_stream([])]
    assert stream.closed


@pytest.mark.asyncio
async def test_sdk_nonstream_requires_successful_finish():
    response = NS(choices=[NS(message=NS(content='truncated'), finish_reason='length')])
    client = NS(chat=NS(completions=NS(create=AsyncMock(return_value=response))))
    provider = BaseLLMProvider('test', 'http://unused', 'model', 'A', client=client)
    with pytest.raises(GenerationError):
        await provider.generate([])


@pytest.mark.asyncio
async def test_partial_stream_is_not_cached(monkeypatch):
    import fastapi_app.services.ai_service as module
    provider = FakeProvider(chunks=('partial', RuntimeError('broken')))
    monkeypatch.setattr(module, 'any_llm_key_configured', lambda: True)
    monkeypatch.setattr(module, 'llm_registry', registry(provider))
    monkeypatch.setattr(module, '_llm_cache', module._TTLCache())
    service = module.AIService()
    for _ in range(2):
        with pytest.raises(GenerationError):
            _ = [c async for c in service._generate_stream('system', 'prompt')]
    assert provider.calls == 2
    assert module._llm_cache._d == {}


@pytest.mark.asyncio
async def test_generation_semaphore_bounds_work_and_cancellation_releases_slot(monkeypatch):
    import fastapi_app.services.generation.runtime as module
    monkeypatch.setattr(module.settings, 'GENERATION_CONCURRENCY', 1)
    monkeypatch.setattr(module, '_slots', None)
    entered = asyncio.Event()
    active = peak = 0
    async def worker(wait=False):
        nonlocal active, peak
        async with generation_scope():
            active += 1
            peak = max(peak, active)
            try:
                entered.set()
                await asyncio.sleep(10 if wait else 0.001)
            finally:
                active -= 1
    first = asyncio.create_task(worker(True))
    await entered.wait()
    second = asyncio.create_task(worker())
    await asyncio.sleep(0)
    first.cancel()
    await asyncio.gather(first, return_exceptions=True)
    await second
    assert active == 0 and peak == 1
