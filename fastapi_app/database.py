import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from fastapi import Request, HTTPException
from fastapi_app.config import settings

class Base(DeclarativeBase):
    pass

async def get_db(request: Request = None) -> AsyncSession:
    if settings.DEMO_MODE and request:
        session_id = request.cookies.get("session_id")
        if not session_id:
            raise HTTPException(status_code=401, detail="Session ID missing. Please refresh the page.")
            
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
    
    engine = create_async_engine(db_url, echo=False)
    
    if db_url.startswith("sqlite"):
        async with engine.begin() as conn:
            if needs_init:
                await conn.run_sync(Base.metadata.create_all)
                
        if not needs_init:
            # Basic auto-migration for sticker columns and old schemas (ignore errors if they exist)
            from sqlalchemy import text
            
            try:
                async with engine.begin() as conn_0:
                    res = await conn_0.execute(text("PRAGMA table_info(notes)"))
                    columns = [row[1] for row in res.fetchall()]
                    
                    if columns and "title" not in columns:
                        await conn_0.execute(text("ALTER TABLE notes ADD COLUMN title VARCHAR(150) DEFAULT 'Без названия'"))
                        try:
                            await conn_0.execute(text("CREATE INDEX ix_notes_title ON notes (title)"))
                        except Exception:
                            pass
                    
                    if columns and "content_json" not in columns:
                        await conn_0.execute(text("ALTER TABLE notes ADD COLUMN content_json JSON DEFAULT '[]'"))
                    
                    if columns and "is_pinned" not in columns:
                        await conn_0.execute(text("ALTER TABLE notes ADD COLUMN is_pinned BOOLEAN DEFAULT 0"))
                        
                    if columns and "status" not in columns:
                        await conn_0.execute(text("ALTER TABLE notes ADD COLUMN status VARCHAR(20) DEFAULT 'none'"))
                        
                    if columns and "is_deleted" not in columns:
                        await conn_0.execute(text("ALTER TABLE notes ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
                        try:
                            await conn_0.execute(text("CREATE INDEX ix_notes_is_deleted ON notes (is_deleted)"))
                        except Exception:
                            pass
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Migration error (title/other): {e}")
                pass
            
            try:
                async with engine.begin() as conn_1:
                    res = await conn_1.execute(text("PRAGMA table_info(notes)"))
                    columns = [row[1] for row in res.fetchall()]
                    
                    if columns and "sticker_text" not in columns:
                        await conn_1.execute(text("ALTER TABLE notes ADD COLUMN sticker_text VARCHAR"))
                    if columns and "sticker_color" not in columns:
                        await conn_1.execute(text("ALTER TABLE notes ADD COLUMN sticker_color VARCHAR DEFAULT '#fff9c4'"))
            except Exception:
                pass
            
            try:
                async with engine.begin() as conn_2:
                    res = await conn_2.execute(text("PRAGMA table_info(notes)"))
                    columns = [row[1] for row in res.fetchall()]
                    
                    if columns and "sync_id" not in columns:
                        await conn_2.execute(text("ALTER TABLE notes ADD COLUMN sync_id VARCHAR(36)"))
                        try:
                            await conn_2.execute(text("CREATE UNIQUE INDEX ix_notes_sync_id ON notes(sync_id)"))
                        except Exception:
                            pass
            except Exception:
                pass
            
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            yield session
    finally:
        await engine.dispose()
