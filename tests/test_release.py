import hashlib
import io
import json
from pathlib import Path
import sqlite3
from contextlib import closing
import tarfile

import pytest

from scripts.deploy_release import Deployer, unpack
from scripts.release_common import digest, release_lock, snapshot, restore_snapshot

OLD, NEW = 'a' * 40, 'b' * 40


def archive(tmp_path, member=None):
    output = tmp_path / 'release.tar.gz'
    files = {'run.py': b'# test', 'requirements.txt': b''}
    manifest = {'revision': NEW, 'db_schema': 2,
                'files': {name: hashlib.sha256(value).hexdigest() for name, value in files.items()}}
    files['release.json'] = json.dumps(manifest).encode()
    with tarfile.open(output, 'w:gz') as tar:
        for name, value in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(value)
            tar.addfile(info, io.BytesIO(value))
        if member:
            info = tarfile.TarInfo(member)
            tar.addfile(info, io.BytesIO())
    return output


def seed(root):
    data = root / 'shared/data/db'
    data.mkdir(parents=True)
    (root / 'shared/.env').write_text('DEMO_MODE=false')
    (root / 'launcher.py').write_text('# provisioned')
    (root / 'current.json').write_text(json.dumps({'revision': OLD, 'release': 'releases/old', 'db_schema': 1}))
    (root / 'ready.json').write_text(json.dumps({'revision': OLD}))
    with closing(sqlite3.connect(data / 'papanda.db')) as db:
        db.execute('CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT)')
        db.execute("INSERT INTO notes VALUES (1, 'user text')")
        db.execute('PRAGMA user_version=1')
        db.commit()


class Host(Deployer):
    """Systemd/pip boundary substitute; all packaging, SQLite and rollback are real."""
    def __init__(self, root, fail=None):
        super().__init__(root)
        self.fail = fail
        self.actions = []

    def command(self, args, cwd=None, env=None):
        args = [str(arg) for arg in args]
        if 'install' in args and self.fail == 'install':
            raise RuntimeError('installation failed')
        if any(arg.endswith('prepare_data.py') for arg in args):
            candidate = Path(env['DATA_DIR'])
            if candidate != self.data:
                if self.fail == 'preflight':
                    raise RuntimeError('candidate migration failed')
                return
            with closing(sqlite3.connect(candidate / 'db/papanda.db')) as db:
                db.execute('ALTER TABLE notes ADD COLUMN stickers TEXT')
                db.execute('PRAGMA user_version=2')
                db.commit()
            if self.fail == 'migration':
                raise RuntimeError('actual migration failed')

    def service_action(self, action):
        self.actions.append(action)
        if action == 'start' and self.fail == 'restart':
            self.fail = None
            raise RuntimeError('service start failed')

    def health(self, sha):
        self.actions.append('health:' + sha)
        if sha == NEW:
            assert json.loads((self.root / 'ready.json').read_text())['revision'] is None
            if self.fail == 'health':
                raise RuntimeError('wrong SHA')


@pytest.mark.parametrize('failure', ['install', 'preflight', 'migration', 'restart', 'health'])
def test_failed_deployment_preserves_or_restores_old_code_and_data(tmp_path, failure):
    root = tmp_path / 'host'
    seed(root)
    package = archive(tmp_path)
    host = Host(root, failure)
    with pytest.raises(RuntimeError):
        host.deploy(package, NEW, digest(package))
    assert json.loads((root / 'current.json').read_text())['revision'] == OLD
    with closing(sqlite3.connect(root / 'shared/data/db/papanda.db')) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 1
        assert db.execute('SELECT title FROM notes').fetchone()[0] == 'user text'
        assert 'stickers' not in {row[1] for row in db.execute('PRAGMA table_info(notes)')}
    if failure in {'install', 'preflight'}:
        assert host.actions == []
    else:
        assert host.actions[-1] == 'health:' + OLD


def test_success_checks_exact_sha_before_opening_api_and_retains_backup(tmp_path):
    root = tmp_path / 'host'
    seed(root)
    package = archive(tmp_path)
    host = Host(root)
    pointer = host.deploy(package, NEW, digest(package))
    assert pointer['revision'] == NEW
    assert host.actions == ['stop', 'start', 'health:' + NEW]
    assert json.loads((root / 'ready.json').read_text())['revision'] == NEW
    deployment = json.loads((root / 'last-deployment.json').read_text())
    with closing(sqlite3.connect(root / deployment['backup'] / 'db/papanda.db')) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 1


def test_deploy_lock_rejects_concurrent_run(tmp_path):
    with release_lock(tmp_path):
        with pytest.raises(OSError):
            with release_lock(tmp_path):
                pytest.fail('second deployment acquired lock')


def test_redeploy_same_sha_still_closes_write_gate(tmp_path):
    root = tmp_path / 'host'
    seed(root)
    pointer = {'revision': NEW, 'release': 'releases/prior-install', 'db_schema': 1}
    (root / 'current.json').write_text(json.dumps(pointer))
    (root / 'ready.json').write_text(json.dumps({'revision': NEW}))
    package = archive(tmp_path)
    host = Host(root)
    host.deploy(package, NEW, digest(package))
    assert host.actions == ['stop', 'start', 'health:' + NEW]


@pytest.mark.parametrize('name', ['../escape', '/absolute', 'shared/.env', 'C:/escape'])
def test_unsafe_archive_cannot_touch_host_paths(tmp_path, name):
    package = archive(tmp_path, name)
    with pytest.raises(ValueError, match='Unsafe'):
        unpack(package, tmp_path / 'candidate', NEW, digest(package))
    assert not (tmp_path / 'escape').exists()


def test_archive_sha_and_checksum_must_match(tmp_path):
    package = archive(tmp_path)
    with pytest.raises(ValueError):
        unpack(package, tmp_path / 'a', NEW, 'wrong')
    with pytest.raises(ValueError):
        unpack(package, tmp_path / 'b', OLD, digest(package))


def test_restore_rejects_modified_snapshot_before_touching_data(tmp_path):
    root = tmp_path / 'host'
    seed(root)
    backup = snapshot(root / 'shared/data', tmp_path / 'snapshot')
    (backup / 'db/papanda.db').write_bytes(b'corrupt')
    with pytest.raises(ValueError):
        restore_snapshot(root / 'shared/data', backup)
    with closing(sqlite3.connect(root / 'shared/data/db/papanda.db')) as db:
        assert db.execute('SELECT title FROM notes').fetchone()[0] == 'user text'
