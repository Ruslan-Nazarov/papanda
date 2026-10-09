"""Repeated attached-document calls reconcile reservations without live APIs."""
import httpx
import pytest
from dialectic_world.llm.providers import OpenAICompatible

from fastapi_app.services.generation.dialectic_llm import DialecticLLM
from fastapi_app.services.generation.runtime import BudgetExceeded, GenerationContext, generation_scope


@pytest.mark.asyncio
@pytest.mark.parametrize('reported', [True, False])
async def test_document_calls_use_actual_usage_or_retain_unknown_reservation(reported):
    requests = []

    async def handler(request):
        requests.append(request)
        body = {'choices': [{'message': {'content': '{"statement":"done"}'}}]}
        if reported:
            body['usage'] = {'prompt_tokens': 9000, 'completion_tokens': 1000,
                             'prompt_tokens_details': {'cached_tokens': 8000}}
        return httpx.Response(200, json=body)

    provider = OpenAICompatible('fixture', 'https://fixture.invalid', 'fixture', max_tokens=4096)
    llm = DialecticLLM(provider, {'reference_document': 'Документ ' * 2200})
    llm.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    context = GenerationContext(max_tokens=70000)
    try:
        async with generation_scope(context):
            await llm.generate([{'role': 'user', 'content': 'first block'}])
            if reported:
                await llm.generate([{'role': 'user', 'content': 'second block'}])
                await llm.generate([{'role': 'user', 'content': 'third block'}])
                assert context.tokens_reserved == 30000
                assert context.metrics()['usage_tokens'] == 30000
                assert context.metrics()['cached_input_tokens'] == 24000
            else:
                with pytest.raises(BudgetExceeded):
                    await llm.generate([{'role': 'user', 'content': 'second block'}])
                assert context.calls[0]['usage_tokens'] is None
                assert context.tokens_reserved == context.calls[0]['reserved_tokens']
        assert len(requests) == (3 if reported else 1)
    finally:
        await llm.aclose()
