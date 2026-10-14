"""Expiry cleanup for the supported single-process demo deployment.
Legacy, unregistered database files are deliberately never deleted here.
"""
import asyncio
import logging
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from sqlalchemy.engine import make_url
from fastapi_app.config import settings
from fastapi_app.database import _cache_lock, _engine_cache, _active_leases
from fastapi_app.services.security_store import database

logger = logging.getLogger(__name__)

TRASH_RETENTION_DAYS = 30


def _trash_database_paths():
    if settings.DEMO_MODE:
        if settings.DEMO_DIR.is_dir():
            root = settings.DEMO_DIR.resolve()
            for path in settings.DEMO_DIR.glob('*.db'):
                if path.resolve().parent == root:
                    yield path
        return
    if settings.DATABASE_URL:
        url = make_url(settings.DATABASE_URL)
        if not url.drivername.startswith('sqlite') or not url.database or url.database == ':memory:':
            return
        yield Path(url.database)
    else:
        yield settings.DB_DIR / 'papanda.db'


def purge_expired_trash():
    """Remove expired trashed notes, including from inactive demo sessions."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=TRASH_RETENTION_DAYS))
    cutoff_text = cutoff.strftime('%Y-%m-%d %H:%M:%S.%f')
    for path in _trash_database_paths():
        if not path.is_file():
            continue
        try:
            with sqlite3.connect(path, timeout=1) as db:
                db.execute('PRAGMA foreign_keys=ON')
                db.execute('DELETE FROM notes WHERE is_deleted=1 AND deleted_at IS NOT NULL AND deleted_at<=?',
                           (cutoff_text,))
        except sqlite3.Error:
            logger.exception('Could not purge expired trash in %s', path)

def expired_ids():
    with database() as db:
        return [r[0] for r in db.execute('SELECT id FROM sessions WHERE expires<=?', (time.time(),))]

def retire(sid, path):
    with database() as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT expires FROM sessions WHERE id=?', (sid,)).fetchone()
        # Activity may have renewed this session since expired_ids() ran.
        if not row or row[0] > time.time() or not settings.DEMO_DELETE_EXPIRED_DATA:
            return
        for suffix in ('', '-wal', '-shm'):
            target = path.with_name(path.name + suffix)
            if target.resolve().parent != settings.DEMO_DIR.resolve():
                raise RuntimeError('Demo cleanup path escaped its directory')
            target.unlink(missing_ok=True)
        db.execute('DELETE FROM shares WHERE owner=?', (sid,))
        db.execute('DELETE FROM sessions WHERE id=? AND expires<=?', (sid, time.time()))

async def cleanup_expired_sessions():
    if not settings.DEMO_MODE or not settings.DEMO_DELETE_EXPIRED_DATA:
        return
    for sid in await asyncio.to_thread(expired_ids):
        if len(sid) != 64 or any(c not in '0123456789abcdef' for c in sid):
            continue
        path = settings.DEMO_DIR / (sid + '.db')
        url = f'sqlite+aiosqlite:///{path}'
        async with _cache_lock:
            if _active_leases.get(url):
                continue
            engine = _engine_cache.pop(url, None)
            if engine:
                await engine.dispose()
            await asyncio.to_thread(retire, sid, path)

async def cleanup_old_dbs():
    while True:
        try:
            await asyncio.to_thread(purge_expired_trash)
            await cleanup_expired_sessions()
        except Exception:
            logger.exception('Demo cleanup failed; will retry')
        await asyncio.sleep(3600)
