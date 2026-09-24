"""SQLite migrations: 001 revisions, 002 stickers, 003 learning variants.

DDL and content adaptation run in one explicit transaction. Unknown/corrupt
schemas fail closed. The source snapshot is made before the transaction.
"""
import asyncio
import json
import re
from pathlib import Path
import uuid

from sqlalchemy import inspect
from fastapi_app.config import settings
from fastapi_app.services.block_contract import normalize_legacy_blocks

VERSION = 3


def _validate(connection, metadata, version=VERSION):
    legacy = version == 0
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    for table in metadata.sorted_tables:
        if version < 3 and table.name in {'note_families', 'note_activity'}:
            continue
        if table.name not in tables:
            raise RuntimeError(f'Missing table: {table.name}')
        columns = {c['name'] for c in inspector.get_columns(table.name)}
        required = set(table.columns.keys())
        if version < 2 and table.name in {'notes', 'note_versions'}:
            required -= {'stickers'}
        if version < 3 and table.name == 'notes':
            required -= {'family_id', 'parent_note_id', 'variant_label', 'variant_origin', 'fork_step', 'long_term_goal'}
        if legacy and table.name == 'notes':
            required -= {'revision', 'schema_version', 'is_example', 'share_token'}
        if required - columns:
            raise RuntimeError(f'Missing columns in {table.name}: {sorted(required - columns)}')
        if inspector.get_pk_constraint(table.name)['constrained_columns'] != ['id']:
            raise RuntimeError(f'Missing or incompatible primary key in {table.name}')
        # SQLite's own metadata includes inline REFERENCES added by ALTER TABLE.
        # SQLAlchemy 2.0.28 can omit their ON DELETE action when parsing old DDL.
        grouped_keys = {}
        for row in connection.exec_driver_sql(f'PRAGMA foreign_key_list("{table.name}")'):
            grouped_keys.setdefault(row[0], []).append(row)
        foreign_keys = set()
        for rows in grouped_keys.values():
            rows.sort(key=lambda row: row[1])
            foreign_keys.add((tuple(row[3] for row in rows), rows[0][2],
                              tuple(row[4] for row in rows),
                              None if rows[0][6] == 'NO ACTION' else rows[0][6]))
        for fk in table.foreign_key_constraints:
            if version < 3 and table.name == 'notes' and any(e.parent.name in {'family_id', 'parent_note_id'} for e in fk.elements):
                continue
            expected = (tuple(e.parent.name for e in fk.elements), fk.referred_table.name,
                        tuple(e.column.name for e in fk.elements), fk.ondelete)
            if expected not in foreign_keys:
                raise RuntimeError(f'Missing or incompatible foreign key in {table.name}')
        if not legacy:
            unique = {tuple(i['column_names']) for i in inspector.get_indexes(table.name) if i['unique']}
            unique |= {tuple(i['column_names']) for i in inspector.get_unique_constraints(table.name)}
            expected_unique = {
                'notes': {('sync_id',), ('share_token',)},
                'note_categories': {('name',)},
                'note_connections': {('note_id_from', 'note_id_to')},
            }.get(table.name, set())
            if not expected_unique <= unique:
                raise RuntimeError(f'Missing uniqueness constraint in {table.name}')
    if not legacy and connection.exec_driver_sql(
        "SELECT 1 FROM notes WHERE typeof(revision) != 'integer' OR revision < 1 OR typeof(schema_version) != 'integer' OR schema_version != 1 LIMIT 1"
    ).first():
        raise RuntimeError('Invalid document revision or schema version')
    if connection.exec_driver_sql('PRAGMA foreign_key_check').first():
        raise RuntimeError('SQLite contains orphaned records; repair a copy with scripts/repair_db_copy.py')
    if connection.exec_driver_sql('PRAGMA integrity_check').scalar() != 'ok':
        raise RuntimeError('SQLite integrity check failed')


def _migrate(connection):
    from fastapi_app.database import Base
    from fastapi_app.models import notes  # register metadata
    version = connection.exec_driver_sql('PRAGMA user_version').scalar()
    if version > VERSION:
        raise RuntimeError(f'Unsupported future schema version {version}')
    tables = set(inspect(connection).get_table_names())
    if not tables:
        Base.metadata.create_all(connection)
    else:
        old_columns = {c['name'] for c in inspect(connection).get_columns('notes')} if 'notes' in tables else set()
        if (version == 0 and 'notes' in tables and 'note_categories' in tables
                and not {'note_versions', 'note_connections'} & tables
                and not {'is_example', 'share_token'} & old_columns):
            # Early installations predate history and connections. Existing
            # tables still undergo strict column and foreign-key validation.
            for name in ('note_versions', 'note_connections'):
                Base.metadata.tables[name].create(connection, checkfirst=True)
        _validate(connection, Base.metadata, version=version)
    if version == 0:
        columns = {c['name'] for c in inspect(connection).get_columns('notes')}
        for name in ('revision', 'schema_version'):
            if name not in columns:
                connection.exec_driver_sql(f'ALTER TABLE notes ADD COLUMN {name} INTEGER NOT NULL DEFAULT 1')
        for name, definition in (
            ('is_example', 'BOOLEAN NOT NULL DEFAULT 0'),
            ('share_token', 'VARCHAR(32)'),
        ):
            if name not in columns:
                connection.exec_driver_sql(f'ALTER TABLE notes ADD COLUMN {name} {definition}')
        for table, owner in (('notes', 'id'), ('note_versions', 'note_id')):
            rows = connection.exec_driver_sql(f'SELECT id, {owner}, content_json FROM {table}').fetchall()
            for row_id, note_id, raw in rows:
                blocks = normalize_legacy_blocks(json.loads(raw), note_id)
                from fastapi_app.schemas.notes import BlockContent
                for block in blocks:
                    BlockContent.model_validate(block)
                connection.exec_driver_sql(f'UPDATE {table} SET content_json=? WHERE id=?',
                                           (json.dumps(blocks, ensure_ascii=False), row_id))
        # Explicit uniqueness gates also reject legacy duplicate data transactionally.
        for name, table, columns in (
            ('uq_r3_category_name', 'note_categories', 'name'),
            ('uq_r3_sync_id', 'notes', 'sync_id'), ('uq_r3_share_token', 'notes', 'share_token'),
            ('uq_r3_connection', 'note_connections', 'note_id_from, note_id_to'),
        ):
            connection.exec_driver_sql(f'CREATE UNIQUE INDEX IF NOT EXISTS {name} ON {table} ({columns})')
    if version < 2:
        for table in ('notes', 'note_versions'):
            columns = {c['name'] for c in inspect(connection).get_columns(table)}
            if 'stickers' not in columns:
                connection.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN stickers JSON NOT NULL DEFAULT '[]'")
        # Preserve the old single-sticker field without inventing version history.
        for note_id, text, color, raw in connection.exec_driver_sql(
            'SELECT id, sticker_text, sticker_color, stickers FROM notes'
        ).fetchall():
            if text and not json.loads(raw):
                sticker = {'id': 'legacy-note-sticker', 'title': '', 'text': text,
                           'color': color if re.fullmatch(r'#[0-9a-fA-F]{6}', color or '') else '#fff9c4',
                           'created_at': None}
                connection.exec_driver_sql('UPDATE notes SET stickers=? WHERE id=?',
                                           (json.dumps([sticker], ensure_ascii=False), note_id))
    if version < 3:
        Base.metadata.create_all(connection, checkfirst=True)
        columns = {c['name'] for c in inspect(connection).get_columns('notes')}
        additions = {
            'family_id': 'INTEGER REFERENCES note_families(id) ON DELETE SET NULL',
            'parent_note_id': 'INTEGER REFERENCES notes(id) ON DELETE SET NULL',
            'variant_label': 'VARCHAR(120)',
            'variant_origin': "VARCHAR(20) NOT NULL DEFAULT 'human'",
            'fork_step': 'INTEGER',
            'long_term_goal': 'BOOLEAN NOT NULL DEFAULT 0',
        }
        for name, definition in additions.items():
            if name not in columns:
                connection.exec_driver_sql(f'ALTER TABLE notes ADD COLUMN {name} {definition}')
        connection.exec_driver_sql('CREATE INDEX IF NOT EXISTS ix_notes_family_id ON notes (family_id)')
    connection.exec_driver_sql(f'PRAGMA user_version={VERSION}')
    _validate(connection, Base.metadata)


async def migrate(engine):
    if engine.dialect.name != 'sqlite':
        raise RuntimeError('Only SQLite has a supported migration path')
    try:
        async with engine.connect() as connection:
            version = (await connection.exec_driver_sql('PRAGMA user_version')).scalar()
            populated = (await connection.exec_driver_sql("SELECT 1 FROM sqlite_master WHERE name='notes'")).first()
        if version < VERSION and populated and engine.url.database != ':memory:':
            from scripts.backup_db import backup_database
            source = Path(engine.url.database)
            directory = settings.DATA_DIR / 'migration-backups'
            directory.mkdir(parents=True, exist_ok=True)
            await asyncio.to_thread(backup_database, source, directory / f'{source.stem}-v{version}-{uuid.uuid4().hex}.db')
        async with engine.connect() as connection:
            await connection.exec_driver_sql('BEGIN IMMEDIATE')
            try:
                await connection.run_sync(_migrate)
                await connection.commit()
            except BaseException:
                await connection.rollback()
                raise
    except Exception as error:
        raise RuntimeError(f'Database migration failed; source retained, restore/repair a backup copy: {error}') from error
