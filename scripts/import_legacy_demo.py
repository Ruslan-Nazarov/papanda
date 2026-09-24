"""Offline, operator-approved transfer of a legacy DB to an issued demo session.

The token is read from a private file, never from command-line arguments or logs.
The destination session must not yet have a database. The source is never changed.
Run with DEMO_MODE=true and the application stopped:
python -m scripts.import_legacy_demo SOURCE --session-token-file PRIVATE_FILE
"""
import argparse
import asyncio
import hashlib
from pathlib import Path

from fastapi_app.config import settings
from fastapi_app.database import create_db_engine
from fastapi_app.services.security_store import demo_instance_lock, session_is_live
from scripts.migrate_db_copy import migrate_copy


async def import_legacy_demo(source: Path, token_file: Path):
    if not settings.DEMO_MODE:
        raise RuntimeError('This procedure requires DEMO_MODE=true')
    token = token_file.read_text(encoding='utf-8').strip()
    sid = hashlib.sha256(token.encode()).hexdigest()
    with demo_instance_lock():
        if len(token) != 43 or not session_is_live(sid):
            raise ValueError('Destination must be a live server-issued session')
        destination = settings.DEMO_DIR / f'{sid}.db'
        if destination.exists():
            raise FileExistsError('Destination already has a database; merging requires a separate migration')
        await migrate_copy(source, destination)
        engine = create_db_engine(f'sqlite+aiosqlite:///{destination}')
        try:
            async with engine.begin() as connection:
                # Publishing rights cannot be inherited from an unverified old cookie.
                await connection.exec_driver_sql('UPDATE notes SET share_token=NULL')
        finally:
            await engine.dispose()
        return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--session-token-file', type=Path, required=True)
    args = parser.parse_args()
    asyncio.run(import_legacy_demo(args.source, args.session_token_file))
    print('Legacy copy migrated; previous public links revoked. Source unchanged.')
