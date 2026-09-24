import sqlite3
from contextlib import closing

import pytest

from scripts.backup_db import backup_database


def test_backup_preserves_committed_wal_data_and_refuses_overwrite(tmp_path):
    source = tmp_path / 'live.db'
    target = tmp_path / 'snapshot.db'
    with closing(sqlite3.connect(source)) as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('CREATE TABLE note (body TEXT)')
        db.execute('INSERT INTO note VALUES (?)', ('ручной конспект',))
        db.commit()
        backup_database(source, target)
        with closing(sqlite3.connect(target)) as saved:
            assert saved.execute('SELECT body FROM note').fetchall() == [('ручной конспект',)]
        with pytest.raises(FileExistsError):
            backup_database(source, target)
        assert db.execute('SELECT count(*) FROM note').fetchone()[0] == 1
