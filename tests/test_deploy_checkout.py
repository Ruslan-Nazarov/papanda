"""Exercise the Linux checkout deployer using real Git/tar and a fake service."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/deploy_checkout.sh'


@unittest.skipUnless(os.name == 'posix', 'The production deployer runs on Linux')
class CheckoutDeploymentTests(unittest.TestCase):
    def git(self, root, *args):
        return subprocess.check_output(['git', '-C', str(root), *args], text=True,
                                       stderr=subprocess.DEVNULL).strip()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.origin = self.root / 'origin'
        self.app = self.root / 'app'
        self.origin.mkdir()
        self.git(self.origin, 'init', '-b', 'main')
        self.git(self.origin, 'config', 'user.email', 'test@example.invalid')
        self.git(self.origin, 'config', 'user.name', 'Deployment test')
        (self.origin / 'requirements.txt').write_text('# fixture\n')
        (self.origin / 'version.txt').write_text('old')
        self.git(self.origin, 'add', '.')
        self.git(self.origin, 'commit', '-m', 'old')
        self.old = self.git(self.origin, 'rev-parse', 'HEAD')
        self.git(self.root, 'clone', str(self.origin), str(self.app))
        (self.origin / 'version.txt').write_text('tested')
        self.git(self.origin, 'commit', '-am', 'tested')
        self.revision = self.git(self.origin, 'rev-parse', 'HEAD')
        (self.app / '.env').write_text('existing configuration')
        (self.app / 'data').mkdir()
        (self.app / 'data/note.db').write_bytes(b'existing user data')
        self.archive = self.root / 'release.tar.gz'
        with tarfile.open(self.archive, 'w:gz') as archive:
            for name, content in {
                'fastapi_app/static/dist/app-tested.js': b'built frontend',
                'fastapi_app/static/dist/manifest.json': b'{}',
                'release.json': json.dumps({'revision': self.revision}).encode(),
            }.items():
                info = tarfile.TarInfo(name)
                info.size = len(content)
                archive.addfile(info, io.BytesIO(content))
        self.checksum = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        self.fake_bin = self.root / 'bin'
        self.fake_bin.mkdir()
        self.log = self.root / 'commands.log'
        self.log.touch()
        service = self.fake_bin / 'systemctl'
        service.write_text('#!/bin/sh\n'
                           'if [ "$1" = show ]; then printf "%s\\n" "$PAPANDA_APP_DIR"; exit 0; fi\n'
                           'echo "systemctl $*" >> "$COMMAND_LOG"\n'
                           'if [ "$1" = restart ] && [ "${FAIL_RESTART:-0}" = 1 ]; then exit 1; fi\n')
        service.chmod(0o755)
        python = self.app / 'venv/bin/python'
        python.parent.mkdir(parents=True)
        python.write_text('#!/bin/sh\n'
                          'echo "python $*" >> "$COMMAND_LOG"\n'
                          'if [ "$3" = install ] && [ "${FAIL_INSTALL:-0}" = 1 ]; then exit 1; fi\n'
                          'exit 0\n')
        python.chmod(0o755)

    def deploy(self, **extra_env):
        env = {**os.environ, 'PATH': f'{self.fake_bin}{os.pathsep}{os.environ["PATH"]}',
               'PAPANDA_APP_DIR': str(self.app), 'COMMAND_LOG': str(self.log), **extra_env}
        return subprocess.run(['bash', str(SCRIPT), self.revision, str(self.archive), self.checksum],
                              env=env, capture_output=True, text=True)

    def test_deploys_tested_commit_and_assets_preserving_settings_and_data(self):
        # A newer push must not change which commit this archive deploys.
        (self.origin / 'version.txt').write_text('newer untested commit')
        self.git(self.origin, 'commit', '-am', 'newer')
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.git(self.app, 'rev-parse', 'HEAD'), self.revision)
        self.assertEqual((self.app / '.last_deploy_rev').read_text().strip(), self.old)
        self.assertEqual((self.app / 'fastapi_app/static/dist/app-tested.js').read_bytes(), b'built frontend')
        self.assertEqual((self.app / '.env').read_text(), 'existing configuration')
        self.assertEqual((self.app / 'data/note.db').read_bytes(), b'existing user data')
        self.assertIn('systemctl restart papanda', self.log.read_text())

    def test_bad_archive_stops_before_checkout_or_restart(self):
        self.archive.write_bytes(b'corrupt archive')
        result = self.deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.git(self.app, 'rev-parse', 'HEAD'), self.old)
        self.assertEqual(self.log.read_text(), '')

    def test_dependency_failure_does_not_restart_service(self):
        result = self.deploy(FAIL_INSTALL='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('systemctl restart', self.log.read_text())

    def test_restart_failure_is_not_reported_as_success(self):
        result = self.deploy(FAIL_RESTART='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('systemctl is-active', self.log.read_text())


if __name__ == '__main__':
    unittest.main()
