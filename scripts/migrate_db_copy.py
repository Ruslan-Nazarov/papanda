"""Migrate a NEW SQLite copy, preserving the source and refusing overwrite.

Run as: python -m scripts.migrate_db_copy SOURCE DESTINATION
"""
import argparse
import asyncio
from pathlib import Path

from fastapi_app.database import create_db_engine
from fastapi_app.migrations import migrate
from scripts.backup_db import backup_database


async def migrate_copy(source: Path, destination: Path):
    snapshot = backup_database(source, destination)
    engine = create_db_engine(f'sqlite+aiosqlite:///{snapshot}')
    try:
        await migrate(engine)
    finally:
        await engine.dispose()
    return snapshot


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    print(f'Migrated copy verified: {asyncio.run(migrate_copy(args.source, args.destination))}')
