"""Migrate every managed note DB, including currently inactive demo sessions."""
import asyncio
from contextlib import closing
from pathlib import Path
import sqlite3
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi_app.config import settings
from fastapi_app.database import create_db_engine
from fastapi_app.migrations import migrate
from release_common import database_files


async def prepare():
    for path in database_files(settings.DATA_DIR):
        if path.name == 'security.sqlite3':
            with closing(sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)) as connection:
                if connection.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise RuntimeError('Security registry integrity failure')
            continue
        engine = create_db_engine(f'sqlite+aiosqlite:///{path}')
        try:
            await migrate(engine)
        finally:
            await engine.dispose()


if __name__ == '__main__':
    asyncio.run(prepare())
