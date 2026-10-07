import json

import httpx
import pytest
from dialectic_world.llm.providers import OpenAICompatible
from fastapi_app.services.generation.dialectic_llm import DialecticLLM, _wrong_english_output
from fastapi_app.services.generation.runtime import GenerationContext, generation_scope


RUSSIAN = 'Формализация площади как аддитивной числовой меры фигур, в которой операция квадрата стороны трактуется как функция.'


@pytest.mark.asyncio
@pytest.mark.parametrize('user_request,answer', [
    ('Теорема Пифагора', RUSSIAN),
    ('The Pythagorean theorem', 'The areas satisfy $a^2 + b^2 = c^2$.'),
    ('Объясни теорему Пифагора на английском', 'The areas satisfy $a^2 + b^2 = c^2$.'),
])
async def test_request_language_contract_reaches_provider(user_request, answer):
    async def handler(request):
        messages = json.loads(request.content)['messages']
        assert user_request in messages[0]['content']
        assert 'language of the original user request' in messages[0]['content']
        assert 'Output language: English' not in messages[0]['content']
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps({'statement': answer})}}]})
    llm = DialecticLLM(OpenAICompatible('fixture', 'https://fixture.invalid', 'fixture'),
                      original_request=user_request)
    llm.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        async with generation_scope(GenerationContext()):
            result = await llm.generate([{'role': 'user', 'content': 'Engine instructions in English; return JSON.'}])
        assert json.loads(result)['statement'] == answer
    finally:
        await llm.aclose()


def test_language_check_ignores_keys_symbols_and_short_quotes():
    assert _wrong_english_output(json.dumps({'statement': RUSSIAN}))
    assert _wrong_english_output('```json\n' + json.dumps({'statement': RUSSIAN}) + '\n```')
    assert not _wrong_english_output(json.dumps({'statement': 'The word «площадь» means area. $a^2+b^2=c^2$'}))
    assert not _wrong_english_output('{malformed')


@pytest.mark.asyncio
async def test_http_requests_enforce_language_and_math_and_retry_wrong_language():
    requests = []
    answers = [RUSSIAN, 'The areas satisfy $a^2 + b^2 = c^2$.']
    async def handler(request):
        requests.append(json.loads(request.content))
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps({'statement': answers.pop(0)})}}],
                                        'usage': {'prompt_tokens': 10, 'completion_tokens': 20}})
    llm = DialecticLLM(OpenAICompatible('fixture', 'https://fixture.invalid', 'fixture', max_retries=1),
                      {'reference_document': RUSSIAN}, output_language='English')
    llm.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    context = GenerationContext()
    try:
        async with generation_scope(context):
            result = await llm.generate([{'role': 'user', 'content': 'Return the required JSON.'}])
        assert json.loads(result)['statement'].startswith('The areas')
        assert [call['status'] for call in context.calls] == ['wrong_language', 'completed']
        assert all(call['usage_tokens'] == 30 for call in context.calls)
        for request in requests:
            assert request['messages'][0]['role'] == 'system'
            assert 'Output language: English' in request['messages'][0]['content']
            assert '$a^2 + b^2 = c^2$' in request['messages'][0]['content']
            assert request['messages'][1]['content'] == 'Return the required JSON.'
    finally:
        await llm.aclose()


@pytest.mark.asyncio
async def test_wrong_language_is_not_returned_when_attempts_exhausted():
    async def handler(request):
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps({'statement': RUSSIAN})}}]})
    llm = DialecticLLM(OpenAICompatible('fixture', 'https://fixture.invalid', 'fixture', max_retries=0),
                      output_language='English')
    llm.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        async with generation_scope(GenerationContext()):
            with pytest.raises(RuntimeError, match='OutputLanguageError'):
                await llm.generate([{'role': 'user', 'content': 'JSON please'}])
    finally:
        await llm.aclose()
