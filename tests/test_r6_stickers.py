import json
from contextlib import closing
import sqlite3

import pytest

from fastapi_app.database import create_db_engine
from fastapi_app.migrations import migrate

STICKER = {'id': 'st-1', 'title': '<script>literal</script>', 'text': 'Private note',
           'color': '#fef9c3', 'created_at': '2026-09-24T10:00:00Z'}


@pytest.mark.asyncio
async def test_stickers_save_checkpoint_restore_and_public_privacy(file_client):
    created = await file_client.post('/api/dialectics/save', json={'title': 'r6', 'blocks': [], 'stickers': [STICKER]})
    assert created.status_code == 200
    note = created.json()
    url = f"/api/dialectics/{note['id']}"
    expected = note['stickers']
    assert expected[0]['text'] == STICKER['text']
    version = (await file_client.post(url + '/checkpoint', json={'title': 'saved', 'is_manual': True})).json()
    assert version['stickers'] == expected
    changed = (await file_client.patch(url, json={'revision': note['revision'], 'stickers': []})).json()
    assert (await file_client.get(url)).json()['stickers'] == []
    restored = await file_client.post(url + f"/versions/{version['id']}/restore", json={'revision': changed['revision']})
    assert restored.status_code == 200
    assert restored.json()['stickers'] == expected
    share = (await file_client.post(url + '/share')).json()
    public = (await file_client.get('/api/dialectics/shared/' + share['token'])).json()
    assert 'stickers' not in public
    assert STICKER['text'] not in (await file_client.get(share['path'])).text
    for operation, expected_pin in [('pin', True), ('pin', True), ('unpin', False), ('unpin', False)]:
        response = await file_client.post(url + f"/versions/{version['id']}/{operation}")
        assert response.json()['is_manual'] is expected_pin


@pytest.mark.asyncio
async def test_sticker_validation_and_partial_category_updates(client):
    for sticker in ({**STICKER, 'color': 'red;position:fixed'}, {**STICKER, 'text': 'x' * 10001}):
        response = await client.post('/api/dialectics/save', json={'title': 'invalid', 'blocks': [], 'stickers': [sticker]})
        assert response.status_code == 422
    category = (await client.post('/api/dialectics/categories/new', json={'name': 'kept', 'color': '#ffffff'})).json()
    url = f"/api/dialectics/categories/{category['id']}"
    updated = (await client.put(url, json={'color': None})).json()
    assert updated['name'] == 'kept' and updated['color'] is None
    for name in (None, '', 'x' * 101):
        assert (await client.put(url, json={'name': name})).status_code == 422


@pytest.mark.asyncio
async def test_v1_sticker_migration_preserves_legacy_field_and_history(tmp_path):
    path = tmp_path / 'v1.db'
    engine = create_db_engine(f'sqlite+aiosqlite:///{path}')
    try:
        await migrate(engine)
        async with engine.begin() as connection:
            await connection.exec_driver_sql("INSERT INTO notes (id,title,content_json,sticker_text,sticker_color,is_pinned,is_example,is_deleted,status) VALUES (1,'old','[]','legacy text','#ffffff',0,0,0,'none')")
            await connection.exec_driver_sql("INSERT INTO note_versions (id,note_id,title,content_json,is_manual) VALUES (1,1,'history','[]',1)")
            await connection.exec_driver_sql('ALTER TABLE notes DROP COLUMN stickers')
            await connection.exec_driver_sql('ALTER TABLE note_versions DROP COLUMN stickers')
            await connection.exec_driver_sql('PRAGMA user_version=1')
        await migrate(engine)
        await migrate(engine)
        with closing(sqlite3.connect(path)) as connection:
            assert connection.execute('PRAGMA user_version').fetchone()[0] == 2
            text, stickers = connection.execute('SELECT sticker_text, stickers FROM notes').fetchone()
            assert text == json.loads(stickers)[0]['text'] == 'legacy text'
            assert connection.execute('SELECT stickers FROM note_versions').fetchone()[0] == '[]'
    finally:
        await engine.dispose()
