import pytest
from sqlalchemy import text

from fastapi_app.config import settings
from fastapi_app.database import _engine_cache, dispose_all_engines, get_db

pytestmark = [pytest.mark.asyncio, pytest.mark.integration]


async def test_startup_and_note_survive_engine_reopen(file_client):
    assert (await file_client.get('/health')).status_code == 200
    response = await file_client.post('/api/dialectics/save', json={
        'title': 'File-backed persistence',
        'blocks': [{'id': 'manual', 'side': 'left', 'html': '<p>Сохранилось</p>'}],
    })
    assert response.status_code == 200, response.text
    note_id = response.json()['id']
    assert (settings.DB_DIR / 'papanda.db').is_file()
    assert not (settings.BASE_DIR / '.env').exists()
    await dispose_all_engines()
    assert not _engine_cache
    loaded = await file_client.get(f'/api/dialectics/{note_id}')
    assert loaded.status_code == 200
    assert loaded.json()['content_json'][0]['html'] == '<p>Сохранилось</p>'


@pytest.mark.xfail(strict=True, raises=AssertionError, reason='F03 / R1: SQLite foreign keys are disabled')
async def test_file_connections_enforce_foreign_keys(file_client):
    async for session in get_db():
        assert (await session.execute(text('PRAGMA foreign_keys'))).scalar() == 1


@pytest.mark.xfail(strict=True, raises=AssertionError, reason='F03 / R1: deleted note history leaks into a reused ID')
async def test_permanent_delete_cannot_attach_old_versions_to_new_note(file_client):
    original = await file_client.post('/api/dialectics/save', json={
        'title': 'OLD private content', 'blocks': [],
    })
    assert original.status_code == 200
    old_id = original.json()['id']
    checkpoint = await file_client.post(f'/api/dialectics/{old_id}/checkpoint', json={
        'title': 'OLD private content', 'is_manual': True,
    })
    assert checkpoint.status_code == 200
    removed = await file_client.delete(f'/api/dialectics/{old_id}/permanent')
    assert removed.status_code == 200
    created = await file_client.post('/api/dialectics/save', json={
        'title': 'NEW document', 'blocks': [],
    })
    assert created.status_code == 200
    history = await file_client.get(f"/api/dialectics/{created.json()['id']}/versions")
    assert history.status_code == 200
    assert all(v['title'] != 'OLD private content' for v in history.json())
