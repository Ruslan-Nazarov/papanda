"""Repair dangling SQLite references in a NEW copy; never modify the source.

Original rows are preserved as JSON in _integrity_quarantine in the copy.
Review the copy before pointing the application at it. This cannot identify
history already attached to a reused, existing note ID; that needs a backup review.
"""
import argparse
import json
import sqlite3
from contextlib import closing
from pathlib import Path

try:
    from .backup_db import backup_database
except ImportError:
    from backup_db import backup_database


def repair_copy(source: Path, destination: Path) -> int:
    backup_database(source, destination)
    with closing(sqlite3.connect(destination)) as db:
        db.row_factory = sqlite3.Row
        violations = db.execute('PRAGMA foreign_key_check').fetchall()
        if not violations:
            return 0
        # Only the currently understood relationships may be repaired.
        relationships = {
            'notes': ('note_categories', 'category_id'),
            'note_versions': ('notes', 'note_id'),
            'note_connections': ('notes', None),
        }
        with db:
            db.execute('CREATE TABLE IF NOT EXISTS _integrity_quarantine ('
                       'table_name TEXT NOT NULL, record_id INTEGER NOT NULL, '
                       'record_json TEXT NOT NULL, quarantined_at TEXT DEFAULT CURRENT_TIMESTAMP)')
            seen = set()
            for violation in violations:
                table, rowid, parent, fk_id = tuple(violation)
                rule = relationships.get(table)
                if not rule or rule[0] != parent:
                    raise RuntimeError(f'Unrecognized relationship in {table}; copy unchanged')
                fk = next(row for row in db.execute(f'PRAGMA foreign_key_list("{table}")') if row['id'] == fk_id)
                allowed_columns = {'note_id_from', 'note_id_to'} if table == 'note_connections' else {rule[1]}
                if fk['from'] not in allowed_columns or fk['to'] != 'id':
                    raise RuntimeError(f'Unrecognized foreign key in {table}; copy unchanged')
                if (table, rowid) in seen:
                    continue
                seen.add((table, rowid))
                row = db.execute(f'SELECT * FROM "{table}" WHERE rowid=?', (rowid,)).fetchone()
                db.execute('INSERT INTO _integrity_quarantine (table_name, record_id, record_json) VALUES (?, ?, ?)',
                           (table, rowid, json.dumps(dict(row), ensure_ascii=False)))
                if table == 'notes':
                    db.execute('UPDATE notes SET category_id=NULL WHERE rowid=?', (rowid,))
                else:
                    db.execute(f'DELETE FROM "{table}" WHERE rowid=?', (rowid,))
            if db.execute('PRAGMA foreign_key_check').fetchone():
                raise RuntimeError('Unresolved foreign key violations; repair rolled back')
            if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise RuntimeError('Integrity check failed; repair rolled back')
        return len(seen)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    count = repair_copy(args.source, args.destination)
    print(f'Repaired {count} records in copy; original retained: {args.destination}')
