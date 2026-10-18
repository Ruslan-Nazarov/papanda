"""Build a standalone Windows personal edition from the current working tree."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tools', type=Path, help='Isolated PyInstaller --target directory')
    parser.add_argument('--package-only', action='store_true', help='Package an already built personal executable')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    if sys.platform != 'win32':
        parser.error('Build the Windows distribution on Windows')
    if args.tools:
        sys.path.insert(0, str(args.tools.resolve()))
    if not (root / 'fastapi_app/static/dist/manifest.json').is_file():
        parser.error('Run npm run build first')
    subprocess.run(['npm.cmd', 'run', 'build'], cwd=root, check=True)
    if not args.package_only:
        from PyInstaller.__main__ import run
        run([str(root / 'packaging/personal.spec'), '--noconfirm',
             '--distpath', str(root / 'output/personal'),
             '--workpath', str(root / '.cache/personal-build')])
    folder = root / 'output/personal/Papanda-Personal'
    if not (folder / 'Papanda.exe').is_file():
        parser.error('Build the standalone executable before packaging')
    dist_files = set(json.loads((root / '.cache/frontend-outputs.json').read_text()))
    dist_files.add('fastapi_app/static/dist/manifest.json')
    dist_files |= {name + '.LEGAL.txt' for name in tuple(dist_files)}
    # Repackaging also removes old generated assets and redundant engine sources.
    for file in (folder / '_internal').rglob('*'):
        if not file.is_file():
            continue
        relative = file.relative_to(folder / '_internal').as_posix()
        redundant = (relative.startswith('fastapi_app/static/dist/') and relative not in dist_files)
        redundant |= relative.startswith('dialectic_world/') and file.suffix == '.py'
        redundant |= relative.startswith('fastapi_app/templates/legal/') or relative in {
            'fastapi_app/templates/legal.html', 'fastapi_app/static/js/consent.js'}
        if redundant:
            if not file.resolve().is_relative_to(folder.resolve()):
                raise ValueError('Distribution member escaped its output directory')
            file.unlink()
    # Help text is generated from a dedicated distribution source, never local state.
    shutil.copyfile(root / 'packaging/PERSONAL-README.txt', folder / 'ПРОЧИТАЙТЕ.txt')
    forbidden = {'.env', 'settings.env', 'library_notes.json', 'example_notes.json',
                 '.git', 'data', 'backups', 'node_modules', 'venv', '.venv'}
    for file in folder.rglob('*'):
        relative = file.relative_to(folder)
        if any(part in forbidden for part in relative.parts) or file.suffix in {'.db', '.sqlite', '.sqlite3'}:
            raise RuntimeError(f'Forbidden distribution member: {relative}')
    version = re.search(r"VERSION = '([^']+)'", (root / 'fastapi_app/version.py').read_text()).group(1)
    archive = folder.parent / f'Papanda-Personal-{version}-Windows-x64.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=1) as package:
        for file in sorted(folder.rglob('*')):
            if file.is_file():
                package.write(file, file.relative_to(folder.parent))
    with open(archive, 'rb') as handle:
        digest = hashlib.file_digest(handle, 'sha256').hexdigest()
    Path(str(archive) + '.sha256').write_text(digest + '\n')
    audit = [sys.executable, str(root / 'scripts/audit_personal.py'), '--archive', str(archive)]
    if args.tools:
        audit.extend(['--tools', str(args.tools.resolve())])
    subprocess.run(audit, cwd=root, check=True)
    print(f'Personal distribution: {archive}')
    print(f'SHA256: {digest}')


if __name__ == '__main__':
    main()
