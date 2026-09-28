"""Simplification preserves existing notes and historical AI requests."""
import pytest
from fastapi_app.models.notes import Note, NoteFamily, NoteActivity


@pytest.mark.asyncio
async def test_diary_records_requests_without_mutating_note(client):
    note = (await client.post('/api/dialectics/save', json={'title':'Original', 'blocks':[
        {'id':'a', 'side':'left', 'role':'anchor', 'html':'<p>Question</p>'}]})).json()
    for status in ['completed', 'partial', 'failed', 'cancelled', 'not_applicable']:
        response = await client.post(f"/api/dialectics/{note['id']}/activity", json={
            'kind':'ai_request', 'request':'Question', 'text':'Answer', 'status':status})
        assert response.status_code == 200, response.text
    events = (await client.get('/api/dialectics/activity/all')).json()
    assert len(events) == 5
    assert events[0]['data']['request'] == 'Question'
    assert events[0]['data']['text'] == 'Answer'
    assert events[0]['note_title'] == 'Original'
    after = (await client.get(f"/api/dialectics/{note['id']}")).json()
    assert after['content_json'] == note['content_json']
    assert after['revision'] == note['revision']


@pytest.mark.asyncio
async def test_old_variants_and_chat_history_remain_available(client, db_session):
    family = NoteFamily()
    db_session.add(family)
    await db_session.flush()
    original = Note(title='Original', family_id=family.id, content_json=[])
    db_session.add(original)
    await db_session.flush()
    variant = Note(title='Old variant', family_id=family.id, parent_note_id=original.id,
                   variant_label='Legacy', content_json=[{'id':'a', 'side':'left', 'html':'Preserved'}])
    db_session.add(variant)
    db_session.add(NoteActivity(note_id=original.id, kind='question_answer',
        data_json={'question':'Old question', 'answer':'Old answer'}))
    await db_session.commit()
    notes = (await client.get('/api/dialectics')).json()
    assert {original.id, variant.id}.issubset({n['id'] for n in notes})
    saved = (await client.get(f'/api/dialectics/{variant.id}')).json()
    assert saved['content_json'][0]['html'] == 'Preserved'
    events = (await client.get('/api/dialectics/activity/all')).json()
    assert events[0]['data']['answer'] == 'Old answer'
    assert (await client.post(f'/api/dialectics/{original.id}/variants', json={})).status_code == 404
    assert (await client.patch(f'/api/dialectics/{original.id}/goal', json={})).status_code == 404
    assert (await client.post('/api/ai/dialectics/topic-question', json={})).status_code == 404


@pytest.mark.asyncio
async def test_diary_rejects_missing_or_deleted_note(client):
    payload = {'kind':'ai_request', 'request':'Q', 'text':'A', 'status':'completed'}
    assert (await client.post('/api/dialectics/999/activity', json=payload)).status_code == 404
    note = (await client.post('/api/dialectics/save', json={'title':'Deleted', 'blocks':[]})).json()
    await client.delete(f"/api/dialectics/{note['id']}")
    assert (await client.post(f"/api/dialectics/{note['id']}/activity", json=payload)).status_code == 404

