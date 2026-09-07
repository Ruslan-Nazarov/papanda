import re
import asyncio
import logging
from pathlib import Path
from typing import Dict, Tuple
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from fastapi import Request, HTTPException
from fastapi_app.config import settings

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

_engine_cache: Dict[str, AsyncEngine] = {}
_cache_lock = asyncio.Lock()

def _resolve_db_url(request: Request = None) -> Tuple[str, bool]:
    if settings.DEMO_MODE and request:
        session_id = request.cookies.get("session_id")
        if not session_id or not re.fullmatch(r'^[a-zA-Z0-9\-_]{8,64}$', session_id):
            raise HTTPException(status_code=401, detail="Session ID missing or invalid. Please refresh the page.")
            
        settings.DEMO_DIR.mkdir(parents=True, exist_ok=True)
        db_path = settings.DEMO_DIR / f"{session_id}.db"
        db_url = f"sqlite+aiosqlite:///{db_path}"
        needs_init = not db_path.exists()
    else:
        if settings.DATABASE_URL:
            db_url = settings.DATABASE_URL
            if db_url.startswith("sqlite"):
                needs_init = not Path(db_url.replace("sqlite+aiosqlite:///", "")).exists()
            else:
                needs_init = False
        else:
            settings.DB_DIR.mkdir(parents=True, exist_ok=True)
            db_path = settings.DB_DIR / "papanda.db"
            db_url = f"sqlite+aiosqlite:///{db_path}"
            needs_init = not db_path.exists()
    return db_url, needs_init

async def _run_migrations(engine: AsyncEngine):
    """Basic auto-migration for SQLite tables in a single connection pass."""
    try:
        async with engine.begin() as conn:
            res = await conn.execute(text("PRAGMA table_info(notes)"))
            columns = {row[1] for row in res.fetchall()}
            
            if not columns:
                return

            migrations = [
                ("title", "ALTER TABLE notes ADD COLUMN title VARCHAR(150) DEFAULT 'Без названия'"),
                ("content_json", "ALTER TABLE notes ADD COLUMN content_json JSON DEFAULT '[]'"),
                ("is_pinned", "ALTER TABLE notes ADD COLUMN is_pinned BOOLEAN DEFAULT 0"),
                ("is_example", "ALTER TABLE notes ADD COLUMN is_example BOOLEAN DEFAULT 0"),
                ("status", "ALTER TABLE notes ADD COLUMN status VARCHAR(20) DEFAULT 'none'"),
                ("is_deleted", "ALTER TABLE notes ADD COLUMN is_deleted BOOLEAN DEFAULT 0"),
                ("sticker_text", "ALTER TABLE notes ADD COLUMN sticker_text VARCHAR"),
                ("sticker_color", "ALTER TABLE notes ADD COLUMN sticker_color VARCHAR DEFAULT '#fff9c4'"),
                ("sync_id", "ALTER TABLE notes ADD COLUMN sync_id VARCHAR(36)"),
                ("share_token", "ALTER TABLE notes ADD COLUMN share_token VARCHAR(32)"),
            ]
            
            for col_name, sql in migrations:
                if col_name not in columns:
                    try:
                        await conn.execute(text(sql))
                        logger.info("Migration: added column notes.%s", col_name)
                    except Exception as e:
                        logger.warning("Migration column add failed for %s: %s", col_name, e)
            
            # Create indexes if missing
            index_statements = [
                "CREATE INDEX IF NOT EXISTS ix_notes_title ON notes (title)",
                "CREATE INDEX IF NOT EXISTS ix_notes_is_deleted ON notes (is_deleted)",
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_notes_sync_id ON notes (sync_id)",
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_notes_share_token ON notes (share_token)",
            ]
            for idx_sql in index_statements:
                try:
                    await conn.execute(text(idx_sql))
                except Exception as e:
                    logger.warning("Migration index create failed: %s (%s)", idx_sql, e)
    except Exception as e:
        logger.error("Auto-migration error: %s", e)

async def _get_or_create_engine(db_url: str, needs_init: bool) -> AsyncEngine:
    async with _cache_lock:
        if db_url not in _engine_cache:
            engine = create_async_engine(db_url, echo=False)
            _engine_cache[db_url] = engine
            if db_url.startswith("sqlite"):
                async with engine.begin() as conn:
                    if needs_init:
                        await conn.run_sync(Base.metadata.create_all)
                if not needs_init:
                    await _run_migrations(engine)
        return _engine_cache[db_url]

async def get_db(request: Request = None) -> AsyncSession:
    db_url, needs_init = _resolve_db_url(request)
    engine = await _get_or_create_engine(db_url, needs_init)
    
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session

async def dispose_all_engines():
    async with _cache_lock:
        for engine in _engine_cache.values():
            await engine.dispose()
        _engine_cache.clear()

