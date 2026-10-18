import json
from unittest.mock import AsyncMock, patch

import pytest

from fastapi_app.services.ai_service import AIService


PAYLOAD = {
    'note_title': 'Состояние сети', 'block_id': 'example', 'formula': 'x=0.18/0.002154433',
    'value': '0.002154433', 'start': 7, 'end': 18,
    'passages': [{'block_id': 'definition', 'title': 'Нормировка',
                  'text': 'Знаменатель — норма вектора, равная 0.002154433.'}],
}
PROPOSAL = {'status': 'found', 'definition': 'Норма вектора в знаменателе.', 'reason': '',
            'sources': [{'passage': 1, 'quote': 'Знаменатель — норма вектора'}]}


@pytest.mark.asyncio
async def test_suggestion_forwards_context_and_returns_verified_sources(client):
    client.cookies.set('locale', 'ru')
    with patch('fastapi_app.routers.ai.ai_service.suggest_math_definition',
               AsyncMock(return_value=json.dumps(PROPOSAL))) as generate:
        response = await client.post('/api/ai/dialectics/math-definition', json=PAYLOAD)
    assert response.status_code == 200, response.text
    assert response.json()['sources'] == [{**PAYLOAD['passages'][0], 'quote': PROPOSAL['sources'][0]['quote']}]
    assert response.json()['definition'] == PROPOSAL['definition']
    assert generate.call_args.kwargs['locale'] == 'русском'
    assert generate.call_args.args[0]['formula'] == PAYLOAD['formula']
    assert generate.call_args.args[0]['start'] == 7


@pytest.mark.asyncio
@pytest.mark.parametrize('sources', [[{'passage': 1, 'quote': 'Выдуманная цитата'}],
                                    [{'passage': 9, 'quote': 'Знаменатель'}],
                                    [{'passage': True, 'quote': 'Знаменатель'}], []])
async def test_unsupported_suggestions_are_not_presented_as_definitions(client, sources):
    with patch('fastapi_app.routers.ai.ai_service.suggest_math_definition',
               AsyncMock(return_value=json.dumps({**PROPOSAL, 'sources': sources}))):
        response = await client.post('/api/ai/dialectics/math-definition', json=PAYLOAD)
    assert response.status_code == 200
    assert response.json()['status'] == 'not_found'
    assert response.json()['definition'] == ''
    assert response.json()['sources'] == []


@pytest.mark.asyncio
@pytest.mark.parametrize('raw,code', [('not JSON', 502), ('[]', 502),
                                    ('{"status":"sure"}', 502),
                                    ('AI disabled: no keys', 503), ('Error calling AI: unavailable', 503)])
async def test_suggestion_provider_failures_are_retryable(client, raw, code):
    with patch('fastapi_app.routers.ai.ai_service.suggest_math_definition', AsyncMock(return_value=raw)):
        response = await client.post('/api/ai/dialectics/math-definition', json=PAYLOAD)
    assert response.status_code == code


@pytest.mark.asyncio
@pytest.mark.parametrize('patch_data', [
    {'symbol': '', 'value': ''}, {'start': 6}, {'value': '0.18'},
    {'formula': 'x' * 20_001}, {'passages': PAYLOAD['passages'] * 9},
    {'passages': [{'block_id': 'b', 'text': 'x' * 1201}]},
])
async def test_invalid_or_unbounded_context_does_not_call_ai(client, patch_data):
    with patch('fastapi_app.routers.ai.ai_service.suggest_math_definition', AsyncMock()) as generate:
        response = await client.post('/api/ai/dialectics/math-definition', json={**PAYLOAD, **patch_data})
    assert response.status_code == 422, response.text
    generate.assert_not_awaited()


@pytest.mark.asyncio
async def test_suggestion_uses_existing_ai_route_with_structured_context():
    service = AIService()
    with patch.object(service, '_generate', AsyncMock(return_value=json.dumps(PROPOSAL))) as generate:
        await service.suggest_math_definition(PAYLOAD, locale='английском')
    system, user, output = generate.call_args.args
    assert json.loads(user) == PAYLOAD
    assert 'английском' in system
    assert 'Одинаковые числа' in system
    assert output == {'type': 'json_object'}
    assert generate.call_args.kwargs['task'] == 'what_is'


@pytest.mark.asyncio
async def test_number_definitions_survive_save_versions_and_sharing(client):
    annotation = {key: PAYLOAD[key] for key in ('formula', 'value', 'start', 'end')}
    annotation['definition'] = PROPOSAL['definition']
    created = await client.post('/api/dialectics/save', json={'title': 'Нормировка', 'blocks': [
        {'id': 'example', 'side': 'center', 'html': '<p>Расчёт</p>', 'math_number_definitions': [annotation]}]})
    assert created.status_code == 200, created.text
    note = created.json()
    path = f"/api/dialectics/{note['id']}"
    assert (await client.get(path)).json()['content_json'][0]['math_number_definitions'] == [annotation]
    version = (await client.post(path + '/checkpoint', json={'title': 'Определение числа'})).json()
    updated = await client.patch(path, json={'revision': note['revision'], 'blocks': [
        {**note['content_json'][0], 'math_number_definitions': []}]})
    assert updated.status_code == 200, updated.text
    restored = await client.post(path + f"/versions/{version['id']}/restore",
                                 json={'revision': updated.json()['revision']})
    assert restored.json()['content_json'][0]['math_number_definitions'] == [annotation]
    token = (await client.post(path + '/share')).json()['token']
    assert (await client.get('/api/dialectics/shared/' + token)).json()['content_json'][0]['math_number_definitions'] == [annotation]
    shared = await client.get('/s/' + token)
    assert 'math-number-definitions-data' in shared.text
    invalid = await client.post('/api/dialectics/save', json={'title': 'Bad', 'blocks': [
        {'side': 'center', 'math_number_definitions': [{**annotation, 'start': 0}]}]})
    assert invalid.status_code == 422
