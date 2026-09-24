"""Package the tested, clean Git revision plus built local frontend assets."""
import argparse
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

from release_common import digest


def build(root, output, sha):
    root, output = Path(root).resolve(), Path(output).resolve()
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    if not re.fullmatch('[a-f0-9]{40}', sha) or head != sha:
        raise ValueError('Package SHA must equal the checked-out revision')
    subprocess.run(['git', 'diff', '--exit-code', 'HEAD'], cwd=root, check=True, stdout=subprocess.DEVNULL)
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
    files = {name for name in tracked if name.startswith(('fastapi_app/', 'prompts/', 'scripts/'))
             or name in {'run.py', 'requirements.txt', 'CHANGELOG.md'}}
    dist = root / 'fastapi_app/static/dist'
    if not (dist / 'manifest.json').is_file():
        raise ValueError('Build frontend before packaging')
    files |= {p.relative_to(root).as_posix() for p in dist.rglob('*') if p.is_file()}
    manifest = {'revision': sha, 'db_schema': 2, 'files': {name: digest(root / name) for name in sorted(files)}}
    output.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(output, 'x:gz') as archive:
        for name in sorted(files):
            if (root / name).is_symlink():
                raise ValueError('Release source must not contain symlinks')
            archive.add(root / name, arcname=name, recursive=False)
        payload = json.dumps(manifest, indent=2).encode()
        entry = tarfile.TarInfo('release.json')
        entry.size = len(payload)
        archive.addfile(entry, io.BytesIO(payload))
    output.with_suffix(output.suffix + '.sha256').write_text(digest(output) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sha', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    build(Path(__file__).resolve().parents[1], args.output, args.sha)
