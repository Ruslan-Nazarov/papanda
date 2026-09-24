"""Create a consistent SQLite snapshot and verify a restore in memory.

The source is opened read-only; an existing destination is never overwritten.
"""
import argparse
import sqlite3
from contextlib import closing
from pathlib import Path


def backup_database(source: Path, destination: Path) -> Path:
    source = source.resolve(strict=True)
    destination = destination.resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open('xb'):
        pass
    with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as original:
        with closing(sqlite3.connect(destination)) as snapshot:
            original.backup(snapshot)
            result = snapshot.execute('PRAGMA integrity_check').fetchall()
            if result != [('ok',)]:
                raise RuntimeError(f'Backup integrity check failed: {result}')
            with closing(sqlite3.connect(':memory:')) as restored:
                snapshot.backup(restored)
                if restored.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
                    raise RuntimeError('Restore verification failed')
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    print(f'Backup created; integrity and restore verified: {backup_database(args.source, args.destination)}')
