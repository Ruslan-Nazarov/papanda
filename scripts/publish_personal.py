"""Publish the exact verified personal ZIP without replacing an existing release."""
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile


def release_version(root, requested_tag=None):
    tree = ast.parse((root / 'fastapi_app/version.py').read_text(encoding='utf-8'))
    version = next(ast.literal_eval(node.value) for node in tree.body
                   if isinstance(node, ast.Assign)
                   and any(isinstance(target, ast.Name) and target.id == 'VERSION'
                           for target in node.targets))
    if not isinstance(version, str) or not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Personal releases require a numeric major.minor.patch version')
    tag = f'personal-v{version}'
    if requested_tag and requested_tag != tag:
        raise ValueError(f'Tag {requested_tag!r} does not match application version {tag}')
    return version, tag


def release_assets(root, version):
    archive = root / 'output/personal' / f'Papanda-Personal-{version}-Windows-x64.zip'
    checksum = archive.with_suffix(archive.suffix + '.sha256')
    expected = checksum.read_text(encoding='utf-8').strip()
    with archive.open('rb') as handle:
        actual = hashlib.file_digest(handle, 'sha256').hexdigest()
    if not re.fullmatch(r'[a-fA-F0-9]{64}', expected) or expected.lower() != actual:
        raise ValueError(f'Archive checksum does not match: {archive.name}')
    return archive, checksum


def gh(*args, allow_missing=False):
    result = subprocess.run(['gh', *map(str, args)], capture_output=True,
                            text=True, encoding='utf-8', check=False)
    if result.returncode:
        if allow_missing and 'HTTP 404' in result.stderr:
            return None
        raise RuntimeError(result.stderr.strip() or 'GitHub CLI failed')
    return result.stdout.strip()


def publish(root, repository, revision, requested_tag=None):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ValueError('An owner/repository name is required')
    if not re.fullmatch(r'[a-f0-9]{40}', revision):
        raise ValueError('A full tested commit SHA is required')
    version, tag = release_version(root, requested_tag)
    archive, checksum = release_assets(root, version)
    endpoint = f'repos/{repository}'
    existing = gh('api', f'{endpoint}/releases/tags/{tag}', allow_missing=True)
    if existing is not None:
        raise ValueError(f'Release {tag} already exists; its files will not be replaced. '
                         'Use a new application version or inspect the existing draft.')
    tag_ref = gh('api', f'{endpoint}/git/ref/tags/{tag}', allow_missing=True)
    if tag_ref is not None:
        tagged_commit = json.loads(gh('api', f'{endpoint}/commits/{tag}'))
        if tagged_commit['sha'] != revision:
            raise ValueError(f'Tag {tag} points to a different commit')
    notes = f'''Papanda Personal {version} для Windows x64.

1. Скачайте **{archive.name}** из раздела Assets.
2. Распакуйте всю папку и запустите **Papanda.exe**.
3. Оставьте окно Papanda Personal открытым во время работы в браузере.

Python и Node.js устанавливать не нужно. Ручной редактор работает без ИИ-ключа.
Для ИИ добавьте свой ключ и модель в «Настройки ИИ», затем перезапустите программу.
Запросы используют ваш баланс у выбранного провайдера.

Данные: `%LOCALAPPDATA%\\Papanda\\Personal`. Сохранённые конспекты открываются
через «Меню → Открыть конспект». Для резервной копии закройте программу и
скопируйте папку данных целиком.

Файл **{checksum.name}** содержит SHA256 архива.
Сборка из коммита `{revision}` прошла аудит упаковки и проверку запуска,
настроек, сохранения конспекта и восстановления после перезапуска.
'''
    with tempfile.TemporaryDirectory(prefix='papanda-release-') as temp:
        notes_file = Path(temp) / 'notes.md'
        notes_file.write_text(notes, encoding='utf-8')
        # gh creates a draft, uploads both files, then publishes. No --clobber:
        # an existing release or failed draft is never silently overwritten.
        gh('release', 'create', tag, archive, checksum, '--repo', repository,
           '--target', revision, '--title', f'Papanda Personal {version} — Windows x64',
           '--notes-file', notes_file, '--latest')
    url = f'https://github.com/{repository}/releases/tag/{tag}'
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as handle:
            handle.write(f'[Download Papanda Personal {version}]({url})\n')
    print(url)
    return url


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate version/tag without publishing')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    requested_tag = os.environ.get('GITHUB_REF_NAME') if os.environ.get('GITHUB_REF_TYPE') == 'tag' else None
    if args.check:
        print('Personal release:', *release_version(root, requested_tag))
    else:
        publish(root, os.environ.get('GITHUB_REPOSITORY', ''),
                os.environ.get('GITHUB_SHA', ''), requested_tag)


if __name__ == '__main__':
    main()
