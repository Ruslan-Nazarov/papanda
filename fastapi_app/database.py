import re
import asyncio
from contextlib import aclosing
from collections import OrderedDict
from typing import Dict
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from sqlalchemy import text, event
from fastapi import Request, HTTPException
from fastapi_app.config import settings

class Base(DeclarativeBase):
    pass

_engine_cache: Dict[str, AsyncEngine] = OrderedDict()
_cache_lock = asyncio.Lock()
_active_leases: Dict[str, int] = {}
_db_locks = {}


def create_db_engine(db_url: str) -> AsyncEngine:
    options = {'poolclass': NullPool} if db_url.startswith('sqlite') and ':memory:' not in db_url else {}
    engine = create_async_engine(db_url, echo=False, **options)
    if engine.dialect.name == 'sqlite':
        @event.listens_for(engine.sync_engine, 'connect')
        def enable_foreign_keys(connection, _record):
            cursor = connection.cursor()
            try:
                cursor.execute('PRAGMA foreign_keys=ON')
                cursor.execute('PRAGMA foreign_keys')
                if cursor.fetchone()[0] != 1:
                    raise RuntimeError('SQLite foreign keys could not be enabled')
            finally:
                cursor.close()
    return engine

def _resolve_db_url(request: Request = None) -> str:
    if settings.DEMO_MODE and request:
        session_id = getattr(request.state, 'session_id', None)
        if not session_id or not re.fullmatch(r'[a-f0-9]{64}', session_id):
            raise HTTPException(status_code=401, detail="Session ID missing or invalid. Please refresh the page.")
            
        settings.DEMO_DIR.mkdir(parents=True, exist_ok=True)
        db_path = settings.DEMO_DIR / f"{session_id}.db"
        db_url = f"sqlite+aiosqlite:///{db_path}"
    else:
        if settings.DATABASE_URL:
            db_url = settings.DATABASE_URL
        else:
            settings.DB_DIR.mkdir(parents=True, exist_ok=True)
            db_path = settings.DB_DIR / "papanda.db"
            db_url = f"sqlite+aiosqlite:///{db_path}"
    return db_url

async def _get_or_create_engine(db_url: str) -> AsyncEngine:
    async with _cache_lock:
        if db_url not in _engine_cache:
            while len(_engine_cache) >= settings.MAX_CACHED_ENGINES:
                idle = next((url for url in _engine_cache if not _active_leases.get(url)), None)
                if idle is None:
                    raise HTTPException(503, 'All database slots are busy; retry shortly')
                await _engine_cache.pop(idle).dispose()
            engine = create_db_engine(db_url)
            try:
                from fastapi_app.migrations import migrate
                await migrate(engine)
            except Exception:
                await engine.dispose()
                raise
            _engine_cache[db_url] = engine
        _engine_cache.move_to_end(db_url)
        return _engine_cache[db_url]

async def get_db(request: Request = None) -> AsyncSession:
    db_url = _resolve_db_url(request)
    async with _cache_lock:
        _active_leases[db_url] = _active_leases.get(db_url, 0) + 1
        lock = _db_locks.setdefault(db_url, asyncio.Lock())
    try:
        if settings.DEMO_MODE and request:
            from fastapi_app.services.security_store import session_is_live
            if not await asyncio.to_thread(session_is_live, request.state.session_id):
                raise HTTPException(401, 'Demo session expired; reload the page')
        async with lock:
            engine = await _get_or_create_engine(db_url)
            async_session = async_sessionmaker(engine, expire_on_commit=False)
            async with async_session() as session:
                if settings.DEMO_MODE and request and request.method not in {'GET', 'HEAD', 'DELETE'}:
                    pages = (await session.execute(text('PRAGMA page_count'))).scalar()
                    free = (await session.execute(text('PRAGMA freelist_count'))).scalar()
                    page_size = (await session.execute(text('PRAGMA page_size'))).scalar()
                    if (pages - free) * page_size >= settings.DEMO_MAX_DB_BYTES:
                        raise HTTPException(413, 'Demo storage quota reached; delete unused notes')
                yield session
    finally:
        async with _cache_lock:
            _active_leases[db_url] -= 1
            if not _active_leases[db_url]:
                del _active_leases[db_url]
                _db_locks.pop(db_url, None)

async def dispose_all_engines():
    async with _cache_lock:
        for engine in _engine_cache.values():
            await engine.dispose()
        _engine_cache.clear()


async def initialize_databases():
    """Complete all existing active databases before application startup succeeds."""
    from fastapi_app.services.security_store import live_sessions, register_share
    if not settings.DEMO_MODE:
        async for session in get_db():
            pass
        return
    for sid in await asyncio.to_thread(live_sessions):
        if not re.fullmatch(r'[a-f0-9]{64}', sid):
            raise RuntimeError('Invalid session registry')
        path = settings.DEMO_DIR / f'{sid}.db'
        if not path.exists():
            continue
        engine = await _get_or_create_engine(f'sqlite+aiosqlite:///{path}')
        async with engine.connect() as conn:
            rows = (await conn.execute(text('SELECT id,share_token FROM notes WHERE share_token IS NOT NULL AND is_deleted=0'))).all()
            for note_id, token in rows:
                await asyncio.to_thread(register_share, token, sid, note_id)


async def get_public_db(token: str, request: Request):
    if not settings.DEMO_MODE:
        async with aclosing(get_db(request)) as sessions:
            yield await anext(sessions)
        return
    from fastapi_app.services.security_store import share_owner, session_is_live
    owner = await asyncio.to_thread(share_owner, token)
    if (not owner or not re.fullmatch(r'[a-f0-9]{64}', owner[0])
            or not await asyncio.to_thread(session_is_live, owner[0])
            or not (settings.DEMO_DIR / f'{owner[0]}.db').is_file()):
        raise HTTPException(404, 'Not found')
    scope = {**request.scope, 'state': {**request.scope.get('state', {}), 'session_id': owner[0]}}
    async with aclosing(get_db(Request(scope))) as sessions:
        yield await anext(sessions)
