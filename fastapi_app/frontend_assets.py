"""Resolve the lockfile-built frontend; content hashes control cache invalidation."""
import json
from pathlib import Path

MANIFEST = Path(__file__).parent / 'static' / 'dist' / 'manifest.json'
_stamp = None
_assets = {}


def asset(name):
    global _stamp, _assets
    if not MANIFEST.exists():
        raise RuntimeError('Frontend assets missing. Run npm ci and npm run build.')
    stamp = MANIFEST.stat().st_mtime_ns
    if stamp != _stamp:
        _assets = json.loads(MANIFEST.read_text(encoding='utf-8'))
        _stamp = stamp
    return _assets[name]
