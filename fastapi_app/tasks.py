"""Expiry cleanup for the supported single-process demo deployment.
Legacy, unregistered database files are deliberately never deleted here.
"""
import asyncio
import logging
import time
from fastapi_app.config import settings
from fastapi_app.database import _cache_lock, _engine_cache, _active_leases
from fastapi_app.services.security_store import database

logger = logging.getLogger(__name__)

def expired_ids():
    with database() as db:
        return [r[0] for r in db.execute('SELECT id FROM sessions WHERE expires<=?', (time.time(),))]

def retire(sid):
    with database() as db:
        db.execute('DELETE FROM sessions WHERE id=? AND expires<=?', (sid, time.time()))

async def cleanup_expired_sessions():
    if not settings.DEMO_MODE:
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
            for suffix in ('', '-wal', '-shm'):
                target = path.with_name(path.name + suffix)
                if target.resolve().parent != settings.DEMO_DIR.resolve():
                    raise RuntimeError('Demo cleanup path escaped its directory')
                target.unlink(missing_ok=True)
            await asyncio.to_thread(retire, sid)

async def cleanup_old_dbs():
    while True:
        try:
            await cleanup_expired_sessions()
        except Exception:
            logger.exception('Demo cleanup failed; will retry')
        await asyncio.sleep(3600)
