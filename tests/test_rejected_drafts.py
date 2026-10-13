import json
from types import SimpleNamespace

import httpx
import pytest
from dialectic_world.llm.providers import OpenAICompatible
from fastapi_app.routers.ai import GenerationInput
from fastapi_app.services.generation.dialectic_llm import DialecticLLM
from fastapi_app.services.generation.note_context import source_signature
from fastapi_app.services.generation.planner import Planner
from fastapi_app.services.generation.rejected_drafts import relevant_drafts, REJECTED_DRAFT_RULE
from fastapi_app.services.generation.runtime import GenerationContext, generation_scope
from fastapi_app.services.sharing_service import SharingService


@pytest.mark.asyncio
async def test_archive_save_reload_sanitization_and_private_view(client):
    draft = {'id': 'draft-1', 'html': '<p>Old <b>argument</b><script>alert(1)</script></p>',
             'reason': 'Wrong premise', 'created_at': '2026-10-10T01:00:00Z'}
    response = await client.post('/api/dialectics/save', json={'title': 'Rewritten', 'blocks': [
        {'id': 'step1', 'side': 'left', 'role': 'step1', 'html': '<p>Current answer</p>', 'rejected_drafts': [draft]}]})
    assert response.status_code == 200, response.text
    note = (await client.get('/api/dialectics/' + str(response.json()['id']))).json()
    block = note['content_json'][0]
    assert block['html'] == '<p>Current answer</p>'
    saved = block['rejected_drafts'][0]
    assert saved['reason'] == draft['reason'] and saved['id'] == draft['id']
    assert '<b>argument</b>' in saved['html'] and '<script' not in saved['html']
    assert 'rejected_drafts' not in SharingService.public_view(SimpleNamespace(**note))['content_json'][0]


def test_generation_boundary_retains_archive_and_excludes_future_steps():
    drafts = [{'block_id': role, 'role': role, 'content': f'Rejected {role}', 'reason': 'Wrong'}
              for role in ['anchor', 'step1', 'step2.1', 'step5']]
    state = GenerationInput.model_validate({'target_goal': 'Question', 'rejected_drafts': drafts}).model_dump()
    assert len(state['rejected_drafts']) == 4
    assert [d['role'] for d in relevant_drafts(state, 2)] == ['anchor', 'step1', 'step2.1']
    assert REJECTED_DRAFT_RULE in Planner._context(state)
    assert 'Rejected step2.1' in Planner._context(state)
    assert source_signature('Question', None) != source_signature('Question', None, drafts)


@pytest.mark.asyncio
async def test_rejected_variants_and_reasons_reach_provider_as_negative_context():
    drafts = [{'block_id': 's1', 'role': 'step1', 'content': 'Old wrong claim', 'reason': 'Confused cause and effect'}]
    async def handler(request):
        messages = json.loads(request.content)['messages']
        context = messages[-1]['content']
        assert REJECTED_DRAFT_RULE in context
        assert 'Old wrong claim' in context and 'Confused cause and effect' in context
        assert 'Current correct claim' in context
        return httpx.Response(200, json={'choices': [{'message': {'content': '{"statement":"New answer"}'}}]})
    llm = DialecticLLM(OpenAICompatible('fixture', 'https://fixture.invalid', 'fixture'),
        {'rejected_drafts': drafts, 'existing_note_steps': {'step1': {'content': 'Current correct claim'}}})
    llm.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        async with generation_scope(GenerationContext()):
            await llm.generate([{'role': 'user', 'content': 'Continue the note'}])
    finally:
        await llm.aclose()
