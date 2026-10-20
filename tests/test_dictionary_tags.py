import json

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from fastapi_app.database import Base, create_db_engine
from fastapi_app.migrations import migrate, VERSION
from fastapi_app.models.notes import Note, NoteVersion
from fastapi_app.services.dictionary_tags import categorize_dictionary


def test_initial_categories_preserve_explicit_choices_and_classify_concept_names():
    words = [{'word': 'Полносвязный слой'}, {'word': 'Матрица'}, {'word': 'Рекуррентная сеть'},
             {'word': 'Прямой проход'}, {'word': 'Матрица', 'tags': []},
             {'word': 'Своё понятие', 'tags': ['custom']}]
    migrated, tags = categorize_dictionary(words, [{'id': 'custom', 'name': 'Моё', 'color': '#123456'}])
    assert migrated[0]['tags'] == ['network-layers']
    assert migrated[1]['tags'] == ['math']
    assert migrated[2]['tags'] == ['network-types']
    assert migrated[3]['tags'] == ['training']
    assert migrated[4]['tags'] == []
    assert migrated[5]['tags'] == ['custom']
    assert categorize_dictionary(migrated, tags) == (migrated, tags)


@pytest.mark.asyncio
async def test_tag_catalog_and_assignments_survive_api_save_and_version_restore(client):
    tags = [{'id': 'math', 'name': 'Математика', 'color': '#2563eb'}]
    word = {'word': 'Матрица', 'definition': 'Таблица чисел', 'tags': ['math']}
    created = await client.post('/api/dialectics/save', json={
        'title': 'Теги', 'blocks': [], 'dictionary': [word], 'dictionary_tags': tags})
    assert created.status_code == 200, created.text
    note = created.json()
    assert note['dictionary_tags'] == tags
    versions = (await client.get(f'/api/dialectics/{note["id"]}/versions')).json()
    assert versions[0]['dictionary_tags'] == tags
    # An older browser omitting the new article field must not erase migrated tags.
    changed = await client.patch(f'/api/dialectics/{note["id"]}', json={
        'revision': note['revision'], 'dictionary': [{'word': 'Матрица', 'definition': 'Правка'}]})
    assert changed.status_code == 200, changed.text
    assert changed.json()['dictionary'][0]['tags'] == ['math']
    changed = await client.patch(f'/api/dialectics/{note["id"]}', json={
        'revision': changed.json()['revision'], 'dictionary': [{**word, 'tags': []}], 'dictionary_tags': []})
    assert changed.json()['dictionary'][0]['tags'] == []
    restored = await client.post(f'/api/dialectics/{note["id"]}/versions/{versions[0]["id"]}/restore',
                                json={'revision': changed.json()['revision']})
    assert restored.status_code == 200, restored.text
    assert restored.json()['dictionary_tags'] == tags
    assert restored.json()['dictionary'][0]['tags'] == ['math']
    for invalid in [[{**tags[0], 'color': 'red'}], [tags[0], tags[0]], [{**tags[0], 'name': '   '}]]:
        response = await client.patch(f'/api/dialectics/{note["id"]}', json={
            'revision': restored.json()['revision'], 'dictionary_tags': invalid})
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_v8_migration_categorizes_current_glossaries_once_and_preserves_translations(tmp_path):
    engine = create_db_engine(f'sqlite+aiosqlite:///{tmp_path / "v8.db"}')
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with async_sessionmaker(engine)() as session:
            note = Note(title='Старый', content_json=[], dictionary=[{'word': 'Матрица', 'definition': ''}],
                        translations={'en': {'dictionary': [{'word': 'Matrix', 'definition': ''}]},
                                      'kz': {'title': 'Аударма'}})
            session.add(note)
            await session.flush()
            session.add(NoteVersion(note_id=note.id, title='Версия', content_json=[]))
            await session.commit()
        async with engine.begin() as conn:
            for table in ('notes', 'note_versions'):
                await conn.exec_driver_sql(f'ALTER TABLE {table} DROP COLUMN dictionary_tags')
            await conn.exec_driver_sql('PRAGMA user_version=8')
        await migrate(engine)
        async with engine.begin() as conn:
            raw, catalog, translations = (await conn.exec_driver_sql(
                'SELECT dictionary, dictionary_tags, translations FROM notes')).one()
            assert json.loads(raw)[0]['tags'] == ['math']
            assert json.loads(catalog)[0]['name'] == 'Математика'
            assert json.loads(translations)['en']['dictionary_tags'][0]['name'] == 'Mathematics'
            assert json.loads(translations)['kz'] == {'title': 'Аударма'}
            await conn.exec_driver_sql("UPDATE notes SET dictionary='[{\"word\":\"Матрица\",\"definition\":\"\",\"tags\":[]}]'")
        await migrate(engine)
        async with engine.connect() as conn:
            assert (await conn.exec_driver_sql('PRAGMA user_version')).scalar() == VERSION
            assert json.loads((await conn.exec_driver_sql('SELECT dictionary FROM notes')).scalar())[0]['tags'] == []
    finally:
        await engine.dispose()
