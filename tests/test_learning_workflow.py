import pytest

from fastapi_app.services.ai_service import ai_service
from fastapi_app.i18n import get_translator


@pytest.mark.asyncio
@pytest.mark.parametrize('locale,language', [('ru','Russian'), ('en','English'), ('kz','Kazakh')])
async def test_new_learning_text_follows_request_language(client, monkeypatch, locale, language):
    client.cookies.set('locale', locale)
    translate = get_translator(locale)
    note = (await client.post('/api/dialectics/save', json={'title':'User title', 'blocks':[
        {'id':'a', 'role':'anchor', 'side':'left', 'html':'<p>Conclusion</p>',
         'anchorResolved':True, 'sourceGoal':'User question'}]})).json()
    variant = (await client.post(f"/api/dialectics/{note['id']}/variants", json={
        'revision':note['revision'], 'from_step':1, 'label':'User label'})).json()
    assert variant['title'] == 'User title' and variant['variant_label'] == 'User label'
    assert variant['content_json'][0]['title'] == translate('learning_anchor_fallback')
    source = (await client.get(f"/api/dialectics/{note['id']}")).json()
    assert source['variant_label'] == translate('learning_original_variant')

    async def unavailable(system, *args, **kwargs):
        assert f'Answer in {language}' in system
        return 'AI disabled: no provider'
    monkeypatch.setattr(ai_service, '_generate', unavailable)
    response = await client.post('/api/ai/dialectics/topic-question', json={
        'note_id':note['id'], 'question':'User question'})
    assert response.status_code == 503
    assert response.json()['detail'] == translate('learning_ai_unavailable')


@pytest.mark.asyncio
async def test_variant_preserves_original_and_clears_from_selected_step(client):
    created = await client.post('/api/dialectics/save', json={'title': 'Тема', 'blocks': [
        {'id': 'a', 'side': 'left', 'role': 'anchor', 'html': '<p>Вывод ИИ</p>',
         'sourceGoal': 'Цель', 'sourceTitle': 'Исходный вопрос', 'anchorResolved': True},
        {'id': 's1', 'side': 'left', 'role': 'step1', 'html': '<p>Первый процесс</p>'},
        {'id': 's2', 'side': 'right', 'role': 'step2', 'html': '<p>Развитие</p>'},
        {'id': 's3', 'side': 'left', 'role': 'step3', 'html': '<p>Противоположность</p>'},
    ]})
    assert created.status_code == 200, created.text
    original = created.json()
    response = await client.post(f"/api/dialectics/{original['id']}/variants", json={
        'revision': original['revision'], 'from_step': 2, 'label': 'Новая линия'})
    assert response.status_code == 200, response.text
    variant = response.json()
    assert variant['id'] != original['id']
    assert variant['parent_note_id'] == original['id']
    assert variant['variant_label'] == 'Новая линия'
    assert [b['role'] for b in variant['content_json']] == ['anchor', 'step1']
    assert variant['content_json'][0]['html'] == '<p>Цель</p>'
    assert variant['content_json'][0]['title'] == 'Исходный вопрос'
    previous = (await client.get(f"/api/dialectics/{original['id']}")).json()
    assert [b['role'] for b in previous['content_json']] == ['anchor', 'step1', 'step2', 'step3']
    variants = (await client.get(f"/api/dialectics/{variant['id']}/variants")).json()
    assert {v['id'] for v in variants} == {original['id'], variant['id']}
    stale = await client.post(f"/api/dialectics/{original['id']}/variants", json={
        'revision': original['revision'], 'from_step': 1, 'label': 'Устаревшая копия'})
    assert stale.status_code == 409


@pytest.mark.asyncio
async def test_learning_activity_goal_and_question_do_not_change_blocks(client, monkeypatch):
    created = (await client.post('/api/dialectics/save', json={'title': 'Тема', 'blocks': [
        {'id': 'a', 'side': 'left', 'role': 'anchor', 'html': '<p>Цель</p>'}
    ]})).json()
    note_id = created['id']
    goal = await client.patch(f'/api/dialectics/{note_id}/goal', json={
        'revision': created['revision'], 'long_term_goal': True})
    assert goal.status_code == 200, goal.text
    assert goal.json()['long_term_goal'] is True
    decision = await client.post(f'/api/dialectics/{note_id}/activity', json={
        'kind': 'ai_rejected', 'step': 1, 'detail': 'Не подходит'})
    assert decision.status_code == 200, decision.text

    async def answer(*args, **kwargs):
        return 'Пояснение по теме'
    monkeypatch.setattr(ai_service, '_generate', answer)
    asked = await client.post('/api/ai/dialectics/topic-question', json={
        'note_id': note_id, 'question': 'Что здесь важно?'})
    assert asked.status_code == 200, asked.text
    assert asked.json()['answer'] == 'Пояснение по теме'
    events = (await client.get(f'/api/dialectics/{note_id}/activity')).json()
    assert [event['kind'] for event in events] == ['goal_changed', 'ai_rejected', 'question_answer']
    assert events[-1]['data']['question'] == 'Что здесь важно?'
    after = (await client.get(f'/api/dialectics/{note_id}')).json()
    assert after['content_json'] == created['content_json']
