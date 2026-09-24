"""Standard-library release helpers, also used by the host launcher."""
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import sqlite3
from contextlib import closing
import uuid


def digest(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def atomic_json(path, value):
    path = Path(path)
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, path)


@contextmanager
def release_lock(root):
    with (Path(root) / 'deploy.lock').open('a+b') as handle:
        handle.write(b'0')
        handle.flush()
        handle.seek(0)
        if os.name == 'nt':
            import msvcrt
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            if os.name == 'nt':
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle, fcntl.LOCK_UN)


def database_files(data):
    data = Path(data).resolve()
    candidates = [data / 'security.sqlite3']
    for folder in ('db', 'demo'):
        candidates.extend((data / folder).glob('*.db'))
    for path in sorted(candidates):
        if path.is_file():
            if path.is_symlink() or not path.resolve().is_relative_to(data):
                raise ValueError('Database outside managed data directory')
            yield path


def snapshot(data, destination):
    data, destination = Path(data).resolve(), Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=False)
    files = {}
    for source in database_files(data):
        target = destination / source.relative_to(data)
        target.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as original:
            with closing(sqlite3.connect(target)) as copy:
                original.backup(copy)
                if copy.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
                    raise RuntimeError('Snapshot integrity failure')
        files[target.relative_to(destination).as_posix()] = digest(target)
    atomic_json(destination / 'snapshot.json', {'files': files})
    return destination


def restore_snapshot(data, backup):
    """Service must be stopped. Restore exactly the managed database set."""
    data, backup = Path(data).resolve(), Path(backup).resolve()
    files = json.loads((backup / 'snapshot.json').read_text())['files']
    for name, expected in files.items():
        source = (backup / name).resolve()
        target = (data / name).resolve()
        if not source.is_relative_to(backup) or not target.is_relative_to(data) or digest(source) != expected:
            raise ValueError('Invalid snapshot manifest')
    for target in list(database_files(data)):
        for suffix in ('-wal', '-shm'):
            sidecar = target.with_name(target.name + suffix)
            if sidecar.exists():
                sidecar.unlink()
        if target.relative_to(data).as_posix() not in files:
            target.unlink()
    for name in files:
        target = data / name
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_name(target.name + '.restore-' + uuid.uuid4().hex)
        temporary.write_bytes((backup / name).read_bytes())
        os.replace(temporary, target)


def release_environment(root, data=None):
    root = Path(root).resolve()
    data = Path(data or root / 'shared/data').resolve()
    return {**os.environ, 'PAPANDA_ENV_FILE': str(root / 'shared/.env'),
            'PAPANDA_READY_FILE': str(root / 'ready.json'),
            'DATA_DIR': str(data), 'DB_DIR': str(data / 'db'), 'DEMO_DIR': str(data / 'demo'),
            'DATABASE_URL': '', 'HOST': '127.0.0.1', 'PORT': '8080',
            'WEB_CONCURRENCY': '1', 'UVICORN_RELOAD': '0'}
