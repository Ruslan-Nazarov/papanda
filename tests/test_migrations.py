import json
import sqlite3
from contextlib import closing

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from fastapi_app.config import settings
from fastapi_app.database import Base, create_db_engine, dispose_all_engines
from fastapi_app.main import app
from fastapi_app.migrations import migrate
from fastapi_app.models.notes import Note, NoteVersion
from scripts.backup_db import backup_database


async def legacy_database(path):
    engine = create_db_engine(f'sqlite+aiosqlite:///{path}')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine)() as session:
        blocks = [{'html': '<p>Unchanged text</p>', 'side': 'left', 'status': 'draft'},
                  {'id': 'kept', 'side': 'right', 'html': 'original'},
                  {'id': 'kept', 'side': 'right', 'html': 'duplicate id'}]
        note = Note(title='legacy', content_json=blocks)
        session.add(note)
        await session.flush()
        session.add(NoteVersion(note_id=note.id, title='old', content_json=blocks))
        await session.commit()
    async with engine.begin() as conn:
        await conn.exec_driver_sql('ALTER TABLE notes DROP COLUMN revision')
        await conn.exec_driver_sql('ALTER TABLE notes DROP COLUMN schema_version')
    return engine


@pytest.mark.asyncio
@pytest.mark.parametrize('preexisting', [False, True])
async def test_empty_database_migrates_before_use_and_is_repeatable(tmp_path, preexisting):
    path = tmp_path / 'empty.db'
    if preexisting:
        path.touch()
    engine = create_db_engine(f'sqlite+aiosqlite:///{path}')
    try:
        await migrate(engine)
        await migrate(engine)
        async with engine.connect() as conn:
            assert (await conn.exec_driver_sql('PRAGMA user_version')).scalar() == 1
            assert (await conn.exec_driver_sql('PRAGMA foreign_keys')).scalar() == 1
            assert (await conn.exec_driver_sql('SELECT count(*) FROM notes')).scalar() == 0
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_legacy_migration_preserves_text_stable_ids_and_backup_restore(tmp_path):
    path = tmp_path / 'legacy.db'
    engine = await legacy_database(path)
    try:
        await migrate(engine)
        async with async_sessionmaker(engine)() as session:
            note = (await session.execute(select(Note))).scalar_one()
            history = (await session.execute(select(NoteVersion))).scalar_one()
            assert note.schema_version == note.revision == 1
            assert note.content_json == history.content_json
            before = note.content_json
            assert before[0]['html'] == '<p>Unchanged text</p>'
            assert before[0]['status'] == 'in_progress'
            assert before[1]['id'] == 'kept'
            assert len({b['id'] for b in before}) == 3
        await migrate(engine)
        async with async_sessionmaker(engine)() as session:
            assert (await session.execute(select(Note))).scalar_one().content_json == before
        snapshots = list((settings.DATA_DIR / 'migration-backups').glob('*.db'))
        assert len(snapshots) == 1
        restored = backup_database(snapshots[0], tmp_path / 'restored.db')
        with closing(sqlite3.connect(restored)) as db:
            assert db.execute('PRAGMA user_version').fetchone()[0] == 0
            assert 'revision' not in {r[1] for r in db.execute('PRAGMA table_info(notes)')}
            assert json.loads(db.execute('SELECT content_json FROM notes').fetchone()[0])[0]['status'] == 'draft'
    finally:
        await engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize('damage', ['json', 'table', 'future', 'revision', 'unique'])
async def test_bad_database_fails_and_rolls_back_without_partial_schema(tmp_path, damage):
    path = tmp_path / 'bad.db'
    engine = await legacy_database(path)
    if damage in {'revision', 'unique'}:
        await migrate(engine)
    async with engine.begin() as conn:
        if damage == 'json':
            await conn.exec_driver_sql("UPDATE note_versions SET content_json='invalid JSON'")
        elif damage == 'table':
            await conn.exec_driver_sql('DROP TABLE note_connections')
        elif damage == 'future':
            await conn.exec_driver_sql('PRAGMA user_version=99')
        elif damage == 'revision':
            await conn.exec_driver_sql('UPDATE notes SET revision=0')
        else:
            await conn.exec_driver_sql('DROP INDEX uq_r3_share_token')
            await conn.exec_driver_sql('DROP INDEX ix_notes_share_token')
    try:
        with pytest.raises(RuntimeError, match='Database migration failed'):
            await migrate(engine)
        async with engine.connect() as conn:
            if damage in {'json', 'table'}:
                assert (await conn.exec_driver_sql('PRAGMA user_version')).scalar() == 0
                assert 'revision' not in {r[1] for r in await conn.exec_driver_sql('PRAGMA table_info(notes)')}
                raw = (await conn.exec_driver_sql('SELECT content_json FROM notes')).scalar()
                assert json.loads(raw)[0]['status'] == 'draft'
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_lifespan_never_serves_broken_database(tmp_path, monkeypatch):
    path = tmp_path / 'broken.db'
    with closing(sqlite3.connect(path)) as db:
        db.execute('CREATE TABLE notes (id INTEGER PRIMARY KEY)')
    monkeypatch.setattr(settings, 'DATABASE_URL', f'sqlite+aiosqlite:///{path}')
    await dispose_all_engines()
    try:
        with pytest.raises(RuntimeError, match='Database migration failed'):
            async with app.router.lifespan_context(app):
                pytest.fail('Broken database must never reach serving state')
    finally:
        await dispose_all_engines()


@pytest.mark.asyncio
async def test_offline_legacy_transfer_requires_issued_session_and_preserves_source(tmp_path, monkeypatch):
    from fastapi_app.services.security_store import session_for_cookie
    from scripts.import_legacy_demo import import_legacy_demo
    path = tmp_path / 'old-demo.db'
    engine = await legacy_database(path)
    async with engine.begin() as conn:
        await conn.exec_driver_sql("UPDATE notes SET share_token='old-public-token'")
    await engine.dispose()
    source_bytes = path.read_bytes()
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    token_file = tmp_path / 'private-token.txt'
    token_file.write_text('untrusted', encoding='utf-8')
    with pytest.raises(ValueError, match='server-issued'):
        await import_legacy_demo(path, token_file)
    sid, token = session_for_cookie(None)
    token_file.write_text(token, encoding='utf-8')
    copied = await import_legacy_demo(path, token_file)
    assert copied.name == f'{sid}.db'
    with closing(sqlite3.connect(copied)) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 1
        assert db.execute('SELECT share_token FROM notes').fetchone()[0] is None
    assert path.read_bytes() == source_bytes
    with pytest.raises(FileExistsError):
        await import_legacy_demo(path, token_file)
