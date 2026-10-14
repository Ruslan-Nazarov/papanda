from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from fastapi_app.config import settings
from fastapi_app.database import Base, create_db_engine
from fastapi_app.models.notes import Note
from fastapi_app.services.notes_service import NotesService
from fastapi_app.tasks import purge_expired_trash


@pytest.mark.asyncio
async def test_opening_trash_purges_only_notes_older_than_thirty_days(db_session):
    now = datetime.now(timezone.utc)
    expired = Note(title='expired', is_deleted=True, deleted_at=now - timedelta(days=31))
    recent = Note(title='recent', is_deleted=True, deleted_at=now - timedelta(days=29))
    active = Note(title='active', is_deleted=False, deleted_at=now - timedelta(days=40))
    db_session.add_all([expired, recent, active])
    await db_session.commit()

    assert [note.title for note in await NotesService.get_trash(db_session)] == ['recent']
    assert await db_session.get(Note, expired.id) is None
    assert await db_session.get(Note, active.id) is not None

    expired_again = Note(title='expired again', is_deleted=True,
                         deleted_at=now - timedelta(days=31))
    db_session.add(expired_again)
    await db_session.commit()
    with pytest.raises(HTTPException) as error:
        await NotesService.restore_note(db_session, expired_again.id)
    assert error.value.status_code == 410
    assert await db_session.get(Note, expired_again.id) is None


@pytest.mark.asyncio
async def test_maintenance_purges_inactive_demo_database(tmp_path, monkeypatch):
    demo_dir = tmp_path / 'demo'
    demo_dir.mkdir()
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    monkeypatch.setattr(settings, 'DEMO_DIR', demo_dir)
    engine = create_db_engine(f'sqlite+aiosqlite:///{demo_dir / "visitor.db"}')
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            session.add_all([
                Note(title='expired', is_deleted=True,
                     deleted_at=datetime.now(timezone.utc) - timedelta(days=31)),
                Note(title='recent', is_deleted=True,
                     deleted_at=datetime.now(timezone.utc) - timedelta(days=29)),
            ])
            await session.commit()

        purge_expired_trash()

        async with session_factory() as session:
            titles = (await session.execute(select(Note.title))).scalars().all()
        assert titles == ['recent']
    finally:
        await engine.dispose()
