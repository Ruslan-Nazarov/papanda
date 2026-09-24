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


async def test_file_connections_enforce_foreign_keys(file_client):
    async for session in get_db():
        assert (await session.execute(text('PRAGMA foreign_keys'))).scalar() == 1
    engine = next(iter(_engine_cache.values()))
    async with engine.connect() as first, engine.connect() as second:
        assert (await first.execute(text('PRAGMA foreign_keys'))).scalar() == 1
        assert (await second.execute(text('PRAGMA foreign_keys'))).scalar() == 1


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


async def test_delete_cascades_connections_and_missing_source_is_404(file_client):
    first = (await file_client.post('/api/dialectics/save', json={'title': 'A', 'blocks': []})).json()['id']
    second = (await file_client.post('/api/dialectics/save', json={'title': 'B', 'blocks': []})).json()['id']
    missing = await file_client.post('/api/dialectics/999999/connections', json={'note_id_to': second})
    assert missing.status_code == 404
    connection = await file_client.post(f'/api/dialectics/{first}/connections', json={'note_id_to': second})
    assert connection.status_code == 200
    assert (await file_client.delete(f'/api/dialectics/{first}/permanent')).status_code == 200
    async for session in get_db():
        assert (await session.execute(text('SELECT count(*) FROM note_versions WHERE note_id=:id'), {'id': first})).scalar() == 0
        assert (await session.execute(text('SELECT count(*) FROM note_connections WHERE note_id_from=:id OR note_id_to=:id'), {'id': first})).scalar() == 0
        assert (await session.execute(text('PRAGMA foreign_key_check'))).fetchall() == []


async def test_legacy_orphans_block_startup_and_do_not_poison_engine_cache(file_client):
    import sqlite3
    from contextlib import closing
    response = await file_client.post('/api/dialectics/save', json={'title': 'Initial', 'blocks': []})
    assert response.status_code == 200
    await dispose_all_engines()
    with closing(sqlite3.connect(settings.DB_DIR / 'papanda.db')) as db:
        db.execute("INSERT INTO note_versions(note_id,title,content_json,is_manual) VALUES (999999,'orphan','[]',0)")
        db.commit()
    with pytest.raises(RuntimeError, match='orphaned records'):
        async for session in get_db():
            pass
    assert not _engine_cache
