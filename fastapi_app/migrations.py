"""SQLite migration 001: strict legacy baseline, document contract and revisions.

DDL and content adaptation run in one explicit transaction. Unknown/corrupt
schemas fail closed. The source snapshot is made before the transaction.
"""
import asyncio
import json
from pathlib import Path
import uuid

from sqlalchemy import inspect
from fastapi_app.config import settings
from fastapi_app.services.block_contract import normalize_legacy_blocks

VERSION = 1


def _validate(connection, metadata, legacy=False):
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    for table in metadata.sorted_tables:
        if table.name not in tables:
            raise RuntimeError(f'Missing table: {table.name}')
        columns = {c['name'] for c in inspector.get_columns(table.name)}
        required = set(table.columns.keys())
        if legacy and table.name == 'notes':
            required -= {'revision', 'schema_version'}
        if required - columns:
            raise RuntimeError(f'Missing columns in {table.name}: {sorted(required - columns)}')
        if inspector.get_pk_constraint(table.name)['constrained_columns'] != ['id']:
            raise RuntimeError(f'Missing or incompatible primary key in {table.name}')
        foreign_keys = {(tuple(f['constrained_columns']), f['referred_table'],
                         tuple(f['referred_columns']), f.get('options', {}).get('ondelete'))
                        for f in inspector.get_foreign_keys(table.name)}
        for fk in table.foreign_key_constraints:
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
        _validate(connection, Base.metadata, legacy=version == 0)
    if version == 0:
        columns = {c['name'] for c in inspect(connection).get_columns('notes')}
        for name in ('revision', 'schema_version'):
            if name not in columns:
                connection.exec_driver_sql(f'ALTER TABLE notes ADD COLUMN {name} INTEGER NOT NULL DEFAULT 1')
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
