"""Independent, durable public snapshots; never opens a visitor's or author's note DB."""
import json
import sqlite3
import uuid
from contextlib import closing
from datetime import datetime, timezone

from fastapi_app.config import settings


def _connect():
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(settings.DATA_DIR / 'library.sqlite3', timeout=10)
    db.row_factory = sqlite3.Row
    db.executescript('''
        CREATE TABLE IF NOT EXISTS publications (
            id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS author_state (
            source TEXT PRIMARY KEY, id TEXT NOT NULL, target TEXT NOT NULL,
            revision INTEGER, description TEXT NOT NULL DEFAULT '',
            language TEXT NOT NULL DEFAULT 'ru', resources TEXT NOT NULL DEFAULT '[]',
            published INTEGER NOT NULL DEFAULT 0);
    ''')
    columns = {row['name'] for row in db.execute('PRAGMA table_info(author_state)')}
    if 'language' not in columns:
        db.execute("ALTER TABLE author_state ADD COLUMN language TEXT NOT NULL DEFAULT 'ru'")
    if 'resources' not in columns:
        db.execute("ALTER TABLE author_state ADD COLUMN resources TEXT NOT NULL DEFAULT '[]'")
    return db


def list_publications():
    with closing(_connect()) as db:
        rows = []
        for row in db.execute('SELECT * FROM publications ORDER BY updated_at DESC, id'):
            payload = json.loads(row['payload'])
            rows.append({'id': row['id'], 'title': payload['title'],
                         'description': payload.get('description', ''),
                         'language': payload.get('language', 'ru'),
                         'updated_at': row['updated_at']})
        return rows


def get_publication(publication_id):
    with closing(_connect()) as db:
        row = db.execute('SELECT * FROM publications WHERE id=?', (publication_id,)).fetchone()
        return dict(json.loads(row['payload']), id=row['id'], updated_at=row['updated_at']) if row else None


def put_publication(publication_id, payload):
    with closing(_connect()) as db, db:
        db.execute('INSERT INTO publications VALUES (?,?,?) ON CONFLICT(id) DO UPDATE '
                   'SET payload=excluded.payload, updated_at=excluded.updated_at',
                   (publication_id, json.dumps(payload, ensure_ascii=False), datetime.now(timezone.utc).isoformat()))


def delete_publication(publication_id):
    with closing(_connect()) as db, db:
        db.execute('DELETE FROM publications WHERE id=?', (publication_id,))


def author_state(source, target):
    # Reserve identity before any network call so retries cannot create duplicates.
    with closing(_connect()) as db, db:
        db.execute('INSERT OR IGNORE INTO author_state(source,id,target) VALUES (?,?,?)',
                   (source, str(uuid.uuid4()), target))
        return dict(db.execute('SELECT * FROM author_state WHERE source=?', (source,)).fetchone())


def record_publication(source, revision, description, language, resources, published):
    with closing(_connect()) as db, db:
        db.execute('UPDATE author_state SET revision=?, description=?, language=?, resources=?, published=? WHERE source=?',
                   (revision, description, language, json.dumps(resources, ensure_ascii=False), int(published), source))
