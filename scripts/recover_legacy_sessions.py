"""Rehearse legacy recovery on copies; optionally register each original owner.

Run with the service stopped and a current data backup when using --apply.
Never prints UUID bearer credentials, titles, content, or share tokens.
"""
import argparse
import asyncio
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import tempfile
import uuid

from fastapi_app.config import settings
from fastapi_app.database import create_db_engine
from fastapi_app.migrations import migrate
from fastapi_app.services.security_store import register_share, session_for_cookie


async def migrate_file(path):
    engine = create_db_engine(f'sqlite+aiosqlite:///{path}')
    try:
        await migrate(engine)
    finally:
        await engine.dispose()


async def recover(data_dir, apply=False):
    original_data, original_demo = settings.DATA_DIR, settings.DEMO_DIR
    data_dir = Path(data_dir).resolve()
    demo = data_dir / 'demo'
    selected, notes = [], 0
    for path in demo.glob('*.db'):
        try:
            if str(uuid.UUID(path.stem)) != path.stem or path.is_symlink():
                continue
        except ValueError:
            continue
        with closing(sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)) as db:
            exists = db.execute("SELECT 1 FROM sqlite_master WHERE name='notes'").fetchone()
            count = db.execute('SELECT count(*) FROM notes').fetchone()[0] if exists else 0
        if count:
            selected.append(path)
            notes += count
    try:
        with tempfile.TemporaryDirectory(prefix='papanda-recovery-rehearsal-') as temporary:
            settings.DATA_DIR = Path(temporary)
            for index, path in enumerate(selected):
                copy = Path(temporary) / f'{index}.db'
                with closing(sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)) as source:
                    with closing(sqlite3.connect(copy)) as target:
                        source.backup(target)
                await migrate_file(copy)
        settings.DATA_DIR, settings.DEMO_DIR = data_dir, demo
        if apply:
            for path in selected:
                sid, _ = session_for_cookie(path.stem)
                target = demo / f'{sid}.db'
                await migrate_file(target)
                with closing(sqlite3.connect(target.as_uri() + '?mode=ro', uri=True)) as db:
                    for note_id, token in db.execute(
                            'SELECT id,share_token FROM notes WHERE share_token IS NOT NULL AND is_deleted=0'):
                        register_share(token, sid, note_id)
        return {'verified_databases': len(selected), 'legacy_notes': notes, 'applied': apply}
    finally:
        settings.DATA_DIR, settings.DEMO_DIR = original_data, original_demo


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    print(json.dumps(asyncio.run(recover(args.data_dir, args.apply))))
