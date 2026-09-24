import json
from pathlib import Path
import re

VERSION = '0.12.0'
_root = Path(__file__).resolve().parents[1]
_changelog = (_root / 'CHANGELOG.md').read_text(encoding='utf-8')
_release_heading = re.search(rf'^## \[{re.escape(VERSION)}\] - (\d{{4}}-\d{{2}}-\d{{2}})$', _changelog, re.M)
if not _release_heading:
    raise RuntimeError(f'CHANGELOG.md has no release date for {VERSION}')
RELEASE_DATE = _release_heading.group(1)
_manifest = _root / 'release.json'
RELEASE_SHA = json.loads(_manifest.read_text(encoding='utf-8'))['revision'] if _manifest.exists() else 'development'
