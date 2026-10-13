"""Simplification preserves existing notes and historical AI requests."""
import pytest
from datetime import datetime, timedelta, timezone
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


@pytest.mark.asyncio
async def test_diary_is_scoped_and_legacy_sqlite_times_are_explicit_utc(client, db_session):
    first, second = Note(title='First', content_json=[]), Note(title='Second', content_json=[])
    db_session.add_all([first, second])
    await db_session.flush()
    old = NoteActivity(note_id=first.id, kind='question_answer',
        data_json={'question': 'old question'}, created_at=datetime(2026, 10, 9, 3, 51, 26))
    db_session.add_all([old, NoteActivity(note_id=second.id, kind='ai_request', data_json={'request': 'other note'})])
    await db_session.commit()
    entries = (await client.get(f'/api/dialectics/{first.id}/activity')).json()
    assert len(entries) == 1 and entries[0]['note_id'] == first.id
    timestamp = datetime.fromisoformat(entries[0]['created_at'])
    assert timestamp.utcoffset() == timedelta(0)
    assert timestamp.astimezone(timezone(timedelta(hours=5))).strftime('%H:%M:%S') == '08:51:26'
    assert old.created_at.hour == 3  # Presentation fix, no rewrite of historical data.
    all_entries = (await client.get('/api/dialectics/activity/all')).json()
    assert all(datetime.fromisoformat(e['created_at']).tzinfo for e in all_entries)


@pytest.mark.asyncio
async def test_new_diary_timing_is_preserved_and_naive_start_is_rejected(client):
    note = (await client.post('/api/dialectics/save', json={'title': 'Timing', 'blocks': []})).json()
    payload = {'kind': 'ai_request', 'status': 'completed', 'started_at': '2026-10-09T08:51:26+05:00',
               'duration_ms': 1250, 'request': 'Q', 'text': 'A'}
    url = f"/api/dialectics/{note['id']}/activity"
    response = await client.post(url, json=payload)
    assert response.status_code == 200, response.text
    assert datetime.fromisoformat(response.json()['created_at']).tzinfo
    loaded = (await client.get(url)).json()[0]['data']
    assert loaded['duration_ms'] == 1250
    assert datetime.fromisoformat(loaded['started_at']).utcoffset() == timedelta(hours=5)
    assert (await client.post(url, json={**payload, 'started_at': '2026-10-09T08:51:26'})).status_code == 422

