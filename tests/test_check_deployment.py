import io
import json
from unittest.mock import patch

import pytest

from scripts.check_deployment import check


REVISION = 'a' * 40
MANIFEST = {name: '/static/dist/' + name for name in ('app.js', 'runtime.js', 'notes.css', 'vendor.css')}


def responder(health=None, manifest=None, asset_status=200):
    requested = []

    def respond(url, **kwargs):
        path = url.removeprefix('https://papanda.test')
        requested.append(path)
        if path == '/health':
            payload = health if health is not None else {'status': 'ok', 'ready': True, 'revision': REVISION}
        elif path == '/static/dist/manifest.json':
            payload = manifest if manifest is not None else MANIFEST
        elif path in MANIFEST.values():
            payload = 'asset'
        else:
            raise AssertionError(f'Unexpected request that could allocate a session: {path}')
        response = io.BytesIO(json.dumps(payload).encode())
        response.status = asset_status if path in MANIFEST.values() else 200
        return response

    return respond, requested


def test_deployment_probe_checks_assets_without_opening_session_pages():
    respond, requested = responder()
    with patch('scripts.check_deployment.urlopen', side_effect=respond):
        check('https://papanda.test', REVISION, MANIFEST)
    assert requested == ['/health', '/static/dist/manifest.json', *MANIFEST.values()]


@pytest.mark.parametrize('health', [
    {'status': 'ok', 'ready': True, 'revision': 'b' * 40},
    {'status': 'ok', 'ready': False, 'revision': REVISION},
])
def test_deployment_probe_rejects_wrong_or_unready_revision(health):
    respond, requested = responder(health=health)
    with patch('scripts.check_deployment.urlopen', side_effect=respond), pytest.raises(RuntimeError):
        check('https://papanda.test', REVISION, MANIFEST)
    assert requested == ['/health']


def test_deployment_probe_rejects_other_frontend_build():
    respond, _ = responder(manifest={})
    with patch('scripts.check_deployment.urlopen', side_effect=respond), pytest.raises(RuntimeError):
        check('https://papanda.test', REVISION, MANIFEST)


def test_deployment_probe_rejects_missing_assets():
    respond, _ = responder(asset_status=404)
    with patch('scripts.check_deployment.urlopen', side_effect=respond), pytest.raises(RuntimeError):
        check('https://papanda.test', REVISION, MANIFEST)
