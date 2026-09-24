import json
from pathlib import Path

VERSION = '0.12.0'
_manifest = Path(__file__).resolve().parents[1] / 'release.json'
RELEASE_SHA = json.loads(_manifest.read_text(encoding='utf-8'))['revision'] if _manifest.exists() else 'development'
