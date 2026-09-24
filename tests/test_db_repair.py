import sqlite3
from contextlib import closing

from scripts.repair_db_copy import repair_copy


def test_repair_quarantines_orphans_only_in_copy(tmp_path):
    source, target = tmp_path / 'legacy.db', tmp_path / 'repaired.db'
    with closing(sqlite3.connect(source)) as db:
        db.executescript('''
            CREATE TABLE note_categories (id INTEGER PRIMARY KEY);
            CREATE TABLE notes (id INTEGER PRIMARY KEY, category_id INTEGER REFERENCES note_categories(id));
            CREATE TABLE note_versions (id INTEGER PRIMARY KEY, note_id INTEGER REFERENCES notes(id), content_json TEXT);
            CREATE TABLE note_connections (id INTEGER PRIMARY KEY,
                note_id_from INTEGER REFERENCES notes(id), note_id_to INTEGER REFERENCES notes(id));
            INSERT INTO notes VALUES (1, 999);
            INSERT INTO note_versions VALUES (1, 999, 'preserve this');
            INSERT INTO note_connections VALUES (1, 999, 998);
        ''')
    assert repair_copy(source, target) == 3
    with closing(sqlite3.connect(target)) as db:
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []
        assert db.execute('SELECT category_id FROM notes').fetchone() == (None,)
        assert db.execute('SELECT count(*) FROM _integrity_quarantine').fetchone() == (3,)
        assert 'preserve this' in db.execute("SELECT record_json FROM _integrity_quarantine WHERE table_name='note_versions'").fetchone()[0]
    with closing(sqlite3.connect(source)) as db:
        assert len(db.execute('PRAGMA foreign_key_check').fetchall()) == 4
        assert db.execute('SELECT category_id FROM notes').fetchone() == (999,)
