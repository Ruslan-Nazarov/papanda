import hashlib
import json
from pathlib import Path

import pytest

from scripts import publish_personal as release


REVISION = 'a' * 40


def package(tmp_path):
    source = tmp_path / 'fastapi_app'
    source.mkdir()
    # Reading version metadata must not import or execute application code.
    (source / 'version.py').write_text("VERSION = '0.12.3'\nraise RuntimeError('do not import')\n")
    folder = tmp_path / 'output/personal'
    folder.mkdir(parents=True)
    archive = folder / 'Papanda-Personal-0.12.3-Windows-x64.zip'
    archive.write_bytes(b'verified archive fixture')
    checksum = archive.with_suffix('.zip.sha256')
    checksum.write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + '\n')
    return archive, checksum


def test_wrong_tag_fails_before_publication(tmp_path):
    package(tmp_path)
    assert release.release_version(tmp_path) == ('0.12.3', 'personal-v0.12.3')
    with pytest.raises(ValueError, match='does not match'):
        release.release_version(tmp_path, 'personal-v9.0.0')


def test_modified_archive_cannot_be_published(tmp_path, monkeypatch):
    archive, _ = package(tmp_path)
    archive.write_bytes(b'changed after verification')
    calls = []
    monkeypatch.setattr(release, 'gh', lambda *args, **kwargs: calls.append(args))
    with pytest.raises(ValueError, match='checksum'):
        release.publish(tmp_path, 'owner/repo', REVISION)
    assert calls == []


def test_existing_release_or_draft_is_never_replaced(tmp_path, monkeypatch):
    package(tmp_path)
    calls = []
    def github(*args, **kwargs):
        calls.append(args)
        return json.dumps({'draft': True})
    monkeypatch.setattr(release, 'gh', github)
    with pytest.raises(ValueError, match='already exists'):
        release.publish(tmp_path, 'owner/repo', REVISION)
    assert len(calls) == 1
    assert calls[0][0] == 'api'


def test_existing_tag_must_point_to_tested_commit(tmp_path, monkeypatch):
    package(tmp_path)
    calls = []
    def github(*args, **kwargs):
        calls.append(args)
        return None if '/releases/tags/' in args[1] else json.dumps({'sha': 'b' * 40})
    monkeypatch.setattr(release, 'gh', github)
    with pytest.raises(ValueError, match='different commit'):
        release.publish(tmp_path, 'owner/repo', REVISION)
    assert all(args[0] == 'api' for args in calls)


def test_only_matching_zip_and_checksum_are_attached_to_tested_revision(tmp_path, monkeypatch):
    archive, checksum = package(tmp_path)
    (archive.parent / 'Papanda-Personal-0.1.0-Windows-x64.zip').write_bytes(b'stale')
    calls = []
    def github(*args, **kwargs):
        calls.append(args)
        if args[0] == 'release':
            notes_file = Path(args[args.index('--notes-file') + 1])
            assert 'Papanda.exe' in notes_file.read_text(encoding='utf-8')
        return None
    monkeypatch.setattr(release, 'gh', github)
    monkeypatch.delenv('GITHUB_STEP_SUMMARY', raising=False)
    url = release.publish(tmp_path, 'owner/repo', REVISION)
    command = calls[-1]
    assert command[:5] == ('release', 'create', 'personal-v0.12.3', archive, checksum)
    assert command[command.index('--target') + 1] == REVISION
    assert '--clobber' not in command
    assert url == 'https://github.com/owner/repo/releases/tag/personal-v0.12.3'
