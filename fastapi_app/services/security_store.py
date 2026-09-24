"""Server-issued demo sessions and atomic daily budgets on one local SQLite file."""
import hashlib
import secrets
import sqlite3
import time
import os
from contextlib import contextmanager

from fastapi import HTTPException
from fastapi_app.config import settings


@contextmanager
def demo_instance_lock():
    """Database-per-session cleanup is supported by exactly one server process."""
    if not settings.DEMO_MODE:
        yield
        return
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    with (settings.DATA_DIR / 'demo.lock').open('a+b') as handle:
        handle.write(b'0')
        handle.flush()
        handle.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise RuntimeError('Demo mode requires one worker per DATA_DIR') from None
        try:
            yield
        finally:
            if os.name == 'nt':
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle, fcntl.LOCK_UN)


@contextmanager
def database():
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(settings.DATA_DIR / 'security.sqlite3', timeout=5)
    try:
        db.execute('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, expires REAL NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS quotas (day TEXT, subject TEXT, count INTEGER NOT NULL, PRIMARY KEY(day, subject))')
        db.execute('BEGIN IMMEDIATE')
        if 'last_seen' not in {r[1] for r in db.execute('PRAGMA table_info(sessions)')}:
            db.execute('ALTER TABLE sessions ADD COLUMN last_seen REAL NOT NULL DEFAULT 0')
        db.execute('CREATE TABLE IF NOT EXISTS shares (token TEXT PRIMARY KEY, owner TEXT NOT NULL, note_id INTEGER NOT NULL)')
        db.commit()
        with db:
            yield db
    finally:
        db.close()


def session_for_cookie(token):
    now = time.time()
    with database() as db:
        db.execute('BEGIN IMMEDIATE')
        if token and len(token) == 43:
            sid = hashlib.sha256(token.encode()).hexdigest()
            row = db.execute('SELECT expires FROM sessions WHERE id=?', (sid,)).fetchone()
            if row and row[0] > now:
                db.execute('UPDATE sessions SET last_seen=? WHERE id=?', (now, sid))
                return sid, None
        if db.execute('SELECT count(*) FROM sessions').fetchone()[0] >= settings.DEMO_MAX_SESSIONS:
            raise HTTPException(503, 'Demo session capacity reached')
        token = secrets.token_urlsafe(32)
        sid = hashlib.sha256(token.encode()).hexdigest()
        db.execute('INSERT INTO sessions(id,expires,last_seen) VALUES (?, ?, ?)', (sid, now + settings.DEMO_SESSION_TTL_SECONDS, now))
        return sid, token


def reserve_budget(subjects):
    day = time.strftime('%Y-%m-%d', time.gmtime())
    with database() as db:
        db.execute('BEGIN IMMEDIATE')
        for subject, limit in subjects:
            count = db.execute('SELECT count FROM quotas WHERE day=? AND subject=?', (day, subject)).fetchone()
            if limit and count and count[0] >= limit:
                raise HTTPException(429, 'Дневной лимит генераций исчерпан. Попробуйте завтра.')
        for subject, _ in subjects:
            db.execute('INSERT INTO quotas VALUES (?, ?, 1) ON CONFLICT(day, subject) DO UPDATE SET count=count+1', (day, subject))
        db.execute('DELETE FROM quotas WHERE day < ?', (day,))


def session_is_live(sid):
    with database() as db:
        row = db.execute('SELECT expires FROM sessions WHERE id=?', (sid,)).fetchone()
        return bool(row and row[0] > time.time())


def quota_stats():
    day = time.strftime('%Y-%m-%d', time.gmtime())
    with database() as db:
        row = db.execute("SELECT count FROM quotas WHERE day=? AND subject='global'", (day,)).fetchone()
        return {'global_today': row[0] if row else 0}


def register_share(token, owner, note_id):
    with database() as db:
        # Retrying the same publication is safe; a collision with another owner is not.
        db.execute('INSERT INTO shares VALUES (?, ?, ?) ON CONFLICT(token) DO NOTHING', (token, owner, note_id))
        row = db.execute('SELECT owner,note_id FROM shares WHERE token=?', (token,)).fetchone()
        if row != (owner, note_id):
            raise RuntimeError('Public token collision')


def remove_share(token):
    with database() as db:
        db.execute('DELETE FROM shares WHERE token=?', (token,))


def share_owner(token):
    with database() as db:
        return db.execute('SELECT owner,note_id FROM shares WHERE token=?', (token,)).fetchone()


def live_sessions():
    with database() as db:
        return [r[0] for r in db.execute('SELECT id FROM sessions WHERE expires>?', (time.time(),))]
