import pytest

from fastapi_app.services.ai_service import ai_service


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
