"""Server-issued demo sessions and atomic daily budgets on one local SQLite file."""
import hashlib
import hmac
import secrets
import sqlite3
import time
import os
import uuid
from contextlib import contextmanager, closing

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


def _recover_legacy_database(token, sid):
    """The original UUID cookie remains a bearer credential, never a public filename.

    Copy SQLite consistently, keep the source, and never accept paths/symlinks or
    an arbitrary client-selected ID. The registry transaction serializes recovery.
    """
    try:
        if str(uuid.UUID(token)) != token:
            return False
    except (ValueError, TypeError, AttributeError):
        return False
    source = settings.DEMO_DIR / f'{token}.db'
    if not source.is_file() or source.is_symlink():
        return False
    target = settings.DEMO_DIR / f'{sid}.db'
    if target.exists():
        return not target.is_symlink()
    temporary = target.with_suffix('.recovering')
    try:
        with closing(sqlite3.connect(source.resolve().as_uri() + '?mode=ro', uri=True)) as old:
            with closing(sqlite3.connect(temporary)) as new:
                old.backup(new)
                if new.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
                    raise RuntimeError('Legacy database failed integrity check; original retained')
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
    return True


def pending_cookie():
    """Bind concurrent first API requests without allocating a database/registry row."""
    nonce = secrets.token_urlsafe(32)
    signature = hmac.new(settings.SECRET_KEY.encode(), nonce.encode(), hashlib.sha256).hexdigest()
    return f'v1.{nonce}.{signature}'


def _valid_pending_cookie(token):
    if not token or len(token) != 111 or not token.startswith('v1.'):
        return False
    nonce, signature = token[3:46], token[47:]
    expected = hmac.new(settings.SECRET_KEY.encode(), nonce.encode(), hashlib.sha256).hexdigest()
    return token[46] == '.' and hmac.compare_digest(signature, expected)


def session_for_cookie(token):
    now = time.time()
    with database() as db:
        db.execute('BEGIN IMMEDIATE')
        if token and len(token) in {36, 43, 111}:
            sid = hashlib.sha256(token.encode()).hexdigest()
            row = db.execute('SELECT expires FROM sessions WHERE id=?', (sid,)).fetchone()
            if row and (row[0] > now or not settings.DEMO_DELETE_EXPIRED_DATA):
                db.execute('UPDATE sessions SET last_seen=?,expires=? WHERE id=?',
                           (now, now + settings.DEMO_SESSION_TTL_SECONDS, sid))
                return sid, token  # renew the browser cookie along with server expiry
            if not row and len(token) == 36 and _recover_legacy_database(token, sid):
                db.execute('INSERT INTO sessions(id,expires,last_seen) VALUES (?, ?, ?)',
                           (sid, now + settings.DEMO_SESSION_TTL_SECONDS, now))
                return sid, token
            if not row and _valid_pending_cookie(token):
                if (settings.DEMO_MAX_SESSIONS and db.execute('SELECT count(*) FROM sessions').fetchone()[0]
                        >= settings.DEMO_MAX_SESSIONS):
                    raise HTTPException(503, 'Demo session capacity reached')
                db.execute('INSERT INTO sessions(id,expires,last_seen) VALUES (?, ?, ?)',
                           (sid, now + settings.DEMO_SESSION_TTL_SECONDS, now))
                return sid, token
        if (settings.DEMO_MAX_SESSIONS and
                db.execute('SELECT count(*) FROM sessions').fetchone()[0] >= settings.DEMO_MAX_SESSIONS):
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
        return bool(row and (row[0] > time.time() or not settings.DEMO_DELETE_EXPIRED_DATA))


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
        return [r[0] for r in db.execute('SELECT id FROM sessions WHERE expires>? OR ?=0',
                                       (time.time(), int(settings.DEMO_DELETE_EXPIRED_DATA)))]
