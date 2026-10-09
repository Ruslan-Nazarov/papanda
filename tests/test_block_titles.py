import asyncio
import json
from types import SimpleNamespace

import pytest
from fastapi_app.services.generation.block_titles import generate_titles
from fastapi_app.services.generation.runtime import GenerationContext, current_run


@pytest.mark.asyncio
async def test_titles_use_only_generated_content_and_restore_provider_settings():
    provider = SimpleNamespace(max_tokens=16000)
    class LLM:
        context = {'reference_document': 'UNNEEDED DOCUMENT', 'existing_note_steps': {'step5': 'FUTURE'}}
        chain = [provider]
        async def generate(self, messages):
            assert self.context is None and provider.max_tokens == 1500
            prompt = messages[0]['content']
            assert 'UNNEEDED DOCUMENT' not in prompt and 'FUTURE' not in prompt
            assert 'source content' in prompt
            return json.dumps({'titles': {'1': 'Signal acquisition'}})
    llm = LLM()
    old_context = llm.context
    token = current_run.set(GenerationContext())
    try:
        titles = await generate_titles(SimpleNamespace(llm=llm), {'step1': {'content': 'source content'}})
    finally:
        current_run.reset(token)
    assert titles == {'1': 'Signal acquisition'}
    assert llm.context is old_context and provider.max_tokens == 16000


@pytest.mark.asyncio
@pytest.mark.parametrize('response', ['invalid', '{"titles":{"5":"wrong block"}}', '{"titles":{"1":""}}'])
async def test_bad_heading_response_keeps_a_content_heading(response):
    async def generate(messages):
        return response
    llm = SimpleNamespace(context=None, chain=[], generate=generate)
    token = current_run.set(GenerationContext())
    try:
        assert await generate_titles(SimpleNamespace(llm=llm), {'step1': {'content': 'Useful first sentence.\nExplanation'}}) == {'1': 'Useful first sentence'}
    finally:
        current_run.reset(token)


@pytest.mark.asyncio
async def test_cancellation_during_titles_propagates():
    async def generate(messages):
        raise asyncio.CancelledError()
    llm = SimpleNamespace(context={'reference': 'source'}, chain=[], generate=generate)
    token = current_run.set(GenerationContext())
    try:
        with pytest.raises(asyncio.CancelledError):
            await generate_titles(SimpleNamespace(llm=llm), {'step1': {'content': 'content'}})
        assert llm.context == {'reference': 'source'}
    finally:
        current_run.reset(token)
