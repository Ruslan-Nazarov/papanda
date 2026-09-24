"""Fail-fast release deployment. Requires a provisioned host; never edits its Git checkout."""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tarfile
import time
from urllib.request import urlopen
import uuid

try:
    from .release_common import digest, atomic_json, release_lock, snapshot, restore_snapshot, release_environment
except ImportError:
    from release_common import digest, atomic_json, release_lock, snapshot, restore_snapshot, release_environment


def unpack(archive, destination, sha, expected_digest):
    if not re.fullmatch('[a-f0-9]{40}', sha) or digest(archive) != expected_digest:
        raise ValueError('Release checksum or revision invalid')
    destination.mkdir(parents=True, exist_ok=False)
    with tarfile.open(archive) as source:
        members = source.getmembers()
        if len(members) > 10000 or sum(item.size for item in members) > 200 * 1024 * 1024:
            raise ValueError('Release archive exceeds limits')
        names = set()
        for member in members:
            path = PurePosixPath(member.name)
            if (not member.isfile() or path.is_absolute() or '..' in path.parts or '\\' in member.name
                    or ':' in member.name or member.name in names
                    or not (path.parts[0] in {'fastapi_app', 'prompts', 'scripts'}
                            or member.name in {'run.py', 'requirements.txt', 'CHANGELOG.md', 'release.json'})):
                raise ValueError('Unsafe release member')
            names.add(member.name)
        source.extractall(destination, filter='data')
    manifest = json.loads((destination / 'release.json').read_text(encoding='utf-8'))
    if manifest['revision'] != sha or set(manifest['files']) != names - {'release.json'}:
        raise ValueError('Release manifest mismatch')
    for name, expected in manifest['files'].items():
        if digest(destination / name) != expected:
            raise ValueError('Release file checksum mismatch')
    return manifest


class Deployer:
    def __init__(self, root, python='python3.12', service='papanda', url='http://127.0.0.1:8080'):
        self.root = Path(root).resolve()
        self.data = self.root / 'shared/data'
        self.python, self.service, self.url = python, service, url

    def command(self, args, cwd=None, env=None):
        subprocess.run([str(arg) for arg in args], cwd=cwd, env=env, check=True, timeout=600)

    def service_action(self, action):
        prefix = ['sudo', '-n'] if os.name != 'nt' and os.geteuid() != 0 else []
        self.command([*prefix, 'systemctl', action, self.service])

    def health(self, sha):
        for _ in range(60):
            try:
                with urlopen(self.url + '/health', timeout=2) as response:
                    result = json.load(response)
                if result.get('status') == 'ok' and result.get('revision') == sha:
                    with urlopen(self.url + '/', timeout=3) as response:
                        if '/static/dist/app-' in response.read().decode():
                            return
            except (OSError, ValueError):
                pass
            time.sleep(0.5)
        raise RuntimeError('Release health/SHA verification failed')

    def deploy(self, archive, sha, checksum):
        if os.name != 'nt' and os.geteuid() == 0:
            raise RuntimeError('Run deployment as the papanda service account, not root')
        if not (self.root / 'shared/.env').is_file() or not (self.root / 'launcher.py').is_file():
            raise RuntimeError('Provision the host and shared data before deploying')
        with release_lock(self.root):
            return self._deploy(archive, sha, checksum)

    def _deploy(self, archive, sha, checksum):
        run = f'{sha}-{uuid.uuid4().hex[:8]}'
        release = self.root / 'releases' / run
        manifest = unpack(archive, release, sha, checksum)
        env = release_environment(self.root)
        venv = release / '.venv'
        executable = venv / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
        self.command([self.python, '-m', 'venv', venv])
        self.command([executable, '-m', 'pip', 'install', '--require-hashes', '-r', release / 'requirements.txt'], cwd=release)
        self.command([executable, '-m', 'pip', 'check'], cwd=release)
        preflight = snapshot(self.data, release / '.preflight/data')
        test_env = release_environment(self.root, preflight)
        self.command([executable, release / 'scripts/prepare_data.py'], cwd=release, env=test_env)
        self.command([executable, release / 'scripts/verify_release.py', '--sha', sha], cwd=release, env=test_env)

        current = self.root / 'current.json'
        previous = json.loads(current.read_text()) if current.exists() else None
        journal = self.root / 'last-deployment.json'
        previous_journal = json.loads(journal.read_text()) if journal.exists() else None
        backup = self.root / 'backups' / run
        # From here all writes are offline. Retain both code and the exact pre-switch data set.
        self.service_action('stop')
        backed_up = False
        try:
            # Also close the gate when deploying the same Git SHA again.
            atomic_json(self.root / 'ready.json', {'revision': None})
            snapshot(self.data, backup)
            backed_up = True
            self.command([executable, release / 'scripts/prepare_data.py'], cwd=release, env=env)
            pointer = {'revision': sha, 'release': release.relative_to(self.root).as_posix(),
                       'db_schema': manifest['db_schema']}
            atomic_json(current, pointer)
            self.service_action('start')
            self.health(sha)
            atomic_json(journal, {'current': pointer, 'previous': previous,
                                                           'backup': backup.relative_to(self.root).as_posix()})
            atomic_json(self.root / 'ready.json', {'revision': sha})
        except BaseException:
            self.service_action('stop')
            if backed_up:
                restore_snapshot(self.data, backup)
            if previous_journal:
                atomic_json(journal, previous_journal)
            elif journal.exists():
                journal.unlink()
            if previous:
                atomic_json(current, previous)
                self.service_action('start')
                self.health(previous['revision'])
                atomic_json(self.root / 'ready.json', {'revision': previous['revision']})
            elif current.exists():
                current.unlink()
            raise
        print(json.dumps({'event': 'deployment_completed', 'revision': sha}))
        return pointer


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--sha', required=True)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--python', default='python3.12')
    parser.add_argument('--service', default='papanda')
    args = parser.parse_args()
    try:
        Deployer(args.root, args.python, args.service).deploy(args.archive, args.sha, args.sha256)
    except Exception as error:
        print(json.dumps({'event': 'deployment_failed', 'error_type': type(error).__name__}), file=sys.stderr)
        raise SystemExit(1) from None
