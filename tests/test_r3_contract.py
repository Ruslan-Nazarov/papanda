import asyncio
import json
import time

import pytest
from fastapi import HTTPException
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import async_sessionmaker

from fastapi_app.config import settings
from fastapi_app.database import (
    get_db, dispose_all_engines, initialize_databases, _get_or_create_engine,
    _engine_cache, _active_leases, _db_locks,
)
from fastapi_app.main import app
from fastapi_app.models.notes import Note
from fastapi_app.services.note_transactions import commit
from fastapi_app.services.notes_service import NotesService
from fastapi_app.services.security_store import database
from fastapi_app.tasks import cleanup_expired_sessions


async def create(client, **fields):
    response = await client.post('/api/dialectics/save', json={'title': 'note', 'blocks': [], **fields})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.asyncio
async def test_revision_conflict_preserves_winner_and_history_ownership(file_client):
    note = await create(file_client)
    url = f"/api/dialectics/{note['id']}"
    # Two clients read the same snapshot, then submit different changes.
    async with AsyncClient(transport=ASGITransport(app), base_url='http://127.0.0.1') as other:
        stale = (await other.get(url)).json()
        winner = await file_client.patch(url, json={'revision': note['revision'], 'title': 'winner'})
        assert winner.status_code == 200
        assert winner.json()['revision'] == note['revision'] + 1
        conflict = await other.patch(url, json={'revision': stale['revision'], 'title': 'stale'})
        assert conflict.status_code == 409
        assert (await file_client.get(url)).json()['title'] == 'winner'
    version = (await file_client.get(url + '/versions')).json()[0]
    assert (await file_client.post(url + f"/versions/{version['id']}/restore",
                                  json={'revision': stale['revision']})).status_code == 409
    another = await create(file_client)
    wrong = f"/api/dialectics/{another['id']}/versions/{version['id']}"
    for method, suffix, body in [('post', '/restore', {'revision': another['revision']}),
                                 ('post', '/pin', None), ('delete', '', None)]:
        assert (await file_client.request(method, wrong + suffix, json=body)).status_code == 404


@pytest.mark.asyncio
async def test_mapper_catches_concurrent_commit_even_after_revision_precheck(test_engine):
    factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with factory() as first, factory() as second:
        note = Note(title='initial', content_json=[])
        first.add(note)
        await commit(first)
        stale = await second.get(Note, note.id)
        note.title = 'winner'
        await commit(first)
        stale.title = 'loser'
        with pytest.raises(HTTPException) as error:
            await commit(second)
        assert error.value.status_code == 409
        await second.refresh(stale)
        assert stale.title == 'winner'


@pytest.mark.asyncio
async def test_patch_null_absent_duplicates_and_connection_boundaries(client):
    category = (await client.post('/api/dialectics/categories/new', json={'name': 'one'})).json()
    assert (await client.post('/api/dialectics/categories/new', json={'name': 'one'})).status_code == 409
    note = await create(client, category_id=category['id'], sticker_text='text')
    url = f"/api/dialectics/{note['id']}"
    changed = (await client.patch(url, json={'revision': note['revision'], 'title': 'new'})).json()
    assert changed['category_id'] == category['id'] and changed['sticker_text'] == 'text'
    clear = await client.patch(url, json={'revision': changed['revision'], 'category_id': None, 'sticker_text': None})
    assert clear.status_code == 200
    assert clear.json()['category_id'] is None and clear.json()['sticker_text'] is None
    revision = clear.json()['revision']
    for field in ('title', 'blocks', 'status', 'is_pinned', 'is_example', 'sticker_color'):
        assert (await client.patch(url, json={'revision': revision, field: None})).status_code == 422
    assert (await client.patch(url, json={'title': 'no revision'})).status_code == 422
    assert (await client.patch(url, json={'revision': revision, 'category_id': 9999})).status_code == 404
    assert (await client.post(url + f'/status?status=unknown&revision={revision}')).status_code == 422
    assert (await client.get('/api/dialectics/0')).status_code == 422
    second = await create(client)
    assert (await client.post(url + '/connections', json={'note_id_to': 9999})).status_code == 404
    assert (await client.post('/api/dialectics/9999/connections', json={'note_id_to': note['id']})).status_code == 404
    body = {'note_id_to': second['id']}
    assert (await client.post(url + '/connections', json=body)).status_code == 200
    assert (await client.post(url + '/connections', json=body)).status_code == 409
    block = {'id': 'same', 'side': 'left'}
    assert (await client.patch(url, json={'revision': revision, 'blocks': [block, block]})).status_code == 422
    for field in ('status', 'sticker_color'):
        assert (await client.post('/api/dialectics/save', json={'title': 'null', 'blocks': [], field: None})).status_code == 422


@pytest.mark.asyncio
async def test_category_delete_invalidates_loaded_revision(client):
    cat = (await client.post('/api/dialectics/categories/new', json={'name': 'one'})).json()
    note = await create(client, category_id=cat['id'])
    assert (await client.delete(f"/api/dialectics/categories/{cat['id']}")).status_code == 200
    assert (await client.patch(f"/api/dialectics/{note['id']}",
                              json={'revision': note['revision'], 'title': 'stale'})).status_code == 409


@pytest.mark.asyncio
async def test_invalid_ai_steps_fail_before_provider_calls(client):
    for body in ({'action': 'unknown'}, {'action': 'generate_step'},
                 {'action': 'generate_step', 'target_step': '6'},
                 {'action': 'generate_full', 'pinned_step': '-1'}):
        response = await client.post('/api/ai/dialectics/conspectus/route', json=body)
        assert response.status_code == 422
    from fastapi_app.routers.ai import ConspectusRouteRequest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        ConspectusRouteRequest.model_validate({'action': 'generate_step', 'target_step': '0'})


@pytest.mark.asyncio
async def test_demo_public_live_view_revoke_delete_expiry_and_reindex(file_client, monkeypatch):
    await dispose_all_engines()
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    blocks = [{'id': 'section', 'side': 'center', 'role': 'section', 'title': 'Manual section'},
              {'id': 'manual', 'side': 'left', 'html': '<p>Manual text</p>', 'private_meta': 'SECRET'}]
    note = await create(file_client, blocks=blocks, sticker_text='PRIVATE STICKER')
    url = f"/api/dialectics/{note['id']}"
    share = (await file_client.post(url + '/share')).json()
    token = share['token']
    with database() as db:
        count = db.execute('SELECT count(*) FROM sessions').fetchone()[0]
        db.execute('DELETE FROM shares')
    # Registered databases are migrated/reindexed before demo startup completes.
    await dispose_all_engines()
    await initialize_databases()
    async with AsyncClient(transport=ASGITransport(app), base_url='http://127.0.0.1') as visitor:
        page = await visitor.get(share['path'])
        assert page.status_code == 200
        assert page.headers['cache-control'] == 'no-store'
        assert page.headers['referrer-policy'] == 'no-referrer'
        assert 'consent.js' not in page.text  # analytics must not collect the bearer URL
        assert 'Manual section' in page.text and 'Manual text' in page.text
        await visitor.get('/favicon.ico')
        assert 'session_id' not in visitor.cookies
        public = (await visitor.get(f'/api/dialectics/shared/{token}')).json()
        assert set(public) == {'title', 'schema_version', 'content_json'}
        assert 'SECRET' not in json.dumps(public) and 'PRIVATE STICKER' not in json.dumps(public)
        assert len(list(settings.DEMO_DIR.glob('*.db'))) == 1
        with database() as db:
            assert db.execute('SELECT count(*) FROM sessions').fetchone()[0] == count
            assert db.execute('SELECT last_seen FROM sessions').fetchone()[0] > 0
        changed = await file_client.patch(url, json={'revision': note['revision'], 'title': 'live update'})
        assert changed.status_code == 200
        assert 'live update' in (await visitor.get(share['path'])).text
        assert (await file_client.delete(url + '/share')).status_code == 200
        assert (await visitor.get(share['path'])).status_code == 404
        second = (await file_client.post(url + '/share')).json()
        assert second['token'] != token
        await file_client.delete(url)
        assert (await visitor.get(second['path'])).status_code == 404
        await file_client.post(url + '/restore')
        assert (await visitor.get(second['path'])).status_code == 404
        third = (await file_client.post(url + '/share')).json()
        with database() as db:
            db.execute('UPDATE sessions SET expires=?', (time.time() - 1,))
        assert (await visitor.get(third['path'])).status_code == 404
        await cleanup_expired_sessions()
        assert not list(settings.DEMO_DIR.glob('*.db')) and not _engine_cache
        with database() as db:
            assert db.execute('SELECT count(*) FROM shares').fetchone()[0] == 0


@pytest.mark.asyncio
async def test_engine_cap_protects_leases_and_serializes_same_database(tmp_path, monkeypatch):
    await dispose_all_engines()
    monkeypatch.setattr(settings, 'MAX_CACHED_ENGINES', 1)
    one = f'sqlite+aiosqlite:///{tmp_path / "one.db"}'
    two = f'sqlite+aiosqlite:///{tmp_path / "two.db"}'
    await _get_or_create_engine(one)
    _active_leases[one] = 1
    try:
        with pytest.raises(HTTPException) as error:
            await _get_or_create_engine(two)
        assert error.value.status_code == 503
        assert list(_engine_cache) == [one]
    finally:
        _active_leases.pop(one)
    await _get_or_create_engine(two)
    assert list(_engine_cache) == [two]
    monkeypatch.setattr(settings, 'DATABASE_URL', two)
    first = get_db()
    await anext(first)
    second = get_db()
    pending = asyncio.create_task(anext(second))
    try:
        await asyncio.sleep(0.03)
        assert not pending.done() and _active_leases[two] == 2
        await first.aclose()
        await asyncio.wait_for(pending, 2)
    finally:
        await first.aclose()
        await second.aclose()
        await dispose_all_engines()
    assert not _active_leases and not _db_locks


@pytest.mark.asyncio
async def test_example_seed_preserves_user_edits(db_session, tmp_path):
    path = tmp_path / 'examples.json'
    path.write_text(json.dumps([{'sync_id': 'example', 'title': 'seed',
                                'content_json': [{'side': 'left', 'html': '<p>seed</p>'}]}]), encoding='utf-8')
    assert await NotesService.import_examples_from_file(db_session, str(path)) == 1
    note = (await NotesService.get_all_notes(db_session))[0]
    stored = await db_session.get(Note, note.id)
    stored.title = 'user edit'
    await commit(db_session)
    assert await NotesService.import_examples_from_file(db_session, str(path)) == 0
    await db_session.refresh(stored)
    assert stored.title == 'user edit' and stored.content_json[0]['id']
