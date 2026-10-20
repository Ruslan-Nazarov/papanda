import json
import re

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from fastapi_app.database import Base, create_db_engine
from fastapi_app.migrations import migrate, VERSION
from fastapi_app.models.notes import Note, NoteVersion


@pytest.mark.asyncio
async def test_math_symbols_survive_reload_versions_sharing_and_removal(client):
    shared = [{'symbol': 'h', 'definition': 'Состояние сети'}]
    local = [{'symbol': 'h_{k-1}', 'definition': 'Предыдущее состояние'}]
    created = await client.post('/api/dialectics/save', json={
        'title': 'Сеть', 'math_symbols': shared, 'blocks': [
            {'id': 'network', 'side': 'center', 'html': '<p>h</p>', 'math_symbols': local}]})
    assert created.status_code == 200, created.text
    note = created.json()
    path = f"/api/dialectics/{note['id']}"
    reloaded = (await client.get(path)).json()
    assert reloaded['math_symbols'] == shared
    assert reloaded['content_json'][0]['math_symbols'] == local
    version = (await client.post(path + '/checkpoint', json={'title': 'С обозначениями'})).json()
    assert version['math_symbols'] == shared
    updated = await client.patch(path, json={'revision': note['revision'], 'math_symbols': [],
        'blocks': [{**note['content_json'][0], 'math_symbols': []}]})
    assert updated.status_code == 200, updated.text
    assert updated.json()['math_symbols'] == []
    restored = await client.post(path + f"/versions/{version['id']}/restore",
                                 json={'revision': updated.json()['revision']})
    assert restored.status_code == 200, restored.text
    assert restored.json()['math_symbols'] == shared
    assert restored.json()['content_json'][0]['math_symbols'] == local
    token = (await client.post(path + '/share')).json()['token']
    public = (await client.get('/api/dialectics/shared/' + token)).json()
    assert public['math_symbols'] == shared
    assert public['content_json'][0]['math_symbols'] == local
    page = await client.get('/s/' + token)
    assert page.status_code == 200, page.text
    data = json.loads(re.search(r'id="math-symbols-data">(.*?)</script>', page.text, re.S)[1])
    assert data == {'note': shared, 'blocks': {'network': local}}
    translations = json.loads(re.search(r'id="i18n-data">(.*?)</script>', page.text, re.S)[1])
    for key in ('ms_provenance', 'ms_provenance_jump', 'ms_provenance_return', 'ms_provenance_ambiguous'):
        assert translations[key] and translations[key] != key


@pytest.mark.asyncio
@pytest.mark.parametrize('entry', [{'symbol': '', 'definition': 'x'}, {'symbol': 'x', 'definition': ' '},
                                  {'symbol': 'x' * 301, 'definition': 'x'}])
async def test_invalid_math_definitions_are_rejected(client, entry):
    for payload in ({'math_symbols': [entry], 'blocks': []},
                    {'blocks': [{'side': 'center', 'math_symbols': [entry]}]}):
        result = await client.post('/api/dialectics/save', json={'title': 'Bad', **payload})
        assert result.status_code == 422


@pytest.mark.asyncio
async def test_v7_database_adds_symbol_storage_without_changing_notes(tmp_path):
    engine = create_db_engine(f"sqlite+aiosqlite:///{tmp_path / 'v7.db'}")
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with async_sessionmaker(engine)() as session:
            note = Note(title='До миграции', content_json=[{'id': 'old', 'side': 'center', 'html': 'Текст'}])
            session.add(note)
            await session.flush()
            session.add(NoteVersion(note_id=note.id, title='Версия', content_json=note.content_json))
            await session.commit()
        async with engine.begin() as connection:
            for table in ('notes', 'note_versions'):
                await connection.exec_driver_sql(f'ALTER TABLE {table} DROP COLUMN math_symbols')
            await connection.exec_driver_sql('PRAGMA user_version=7')
        await migrate(engine)
        await migrate(engine)
        async with engine.connect() as connection:
            assert (await connection.exec_driver_sql('PRAGMA user_version')).scalar() == VERSION
            for table in ('notes', 'note_versions'):
                row = (await connection.exec_driver_sql(f'SELECT math_symbols, content_json FROM {table}')).one()
                assert json.loads(row[0]) == []
                assert json.loads(row[1])[0]['html'] == 'Текст'
    finally:
        await engine.dispose()
