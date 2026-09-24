"""Install as <root>/launcher.py alongside release_common.py; invoked by systemd."""
import json
import os
from pathlib import Path
import re

from release_common import release_environment


def launch(root):
    root = Path(root).resolve()
    pointer = json.loads((root / 'current.json').read_text())
    release = (root / pointer['release']).resolve()
    if not release.is_relative_to(root / 'releases') or not re.fullmatch('[a-f0-9]{40}', pointer['revision']):
        raise ValueError('Invalid release pointer')
    manifest = json.loads((release / 'release.json').read_text())
    if manifest['revision'] != pointer['revision']:
        raise ValueError('Active release does not match its manifest')
    os.environ.update(release_environment(root))
    os.chdir(release)
    python = release / '.venv/bin/python'
    os.execv(str(python), [str(python), str(release / 'run.py')])


if __name__ == '__main__':
    launch(Path(__file__).resolve().parent)
