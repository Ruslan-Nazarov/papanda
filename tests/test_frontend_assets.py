import re
from html.parser import HTMLParser

import pytest

from fastapi_app.frontend_assets import asset


@pytest.mark.asyncio
async def test_hashed_assets_are_cached_but_html_manifest_and_missing_files_are_not(client):
    for name in ('app.js', 'runtime.js', 'notes.css', 'vendor.css'):
        url = asset(name)
        assert re.search(r'-[A-Z0-9]{8}\.(?:js|css)$', url)
        response = await client.get(url)
        assert response.status_code == 200
        assert response.headers['cache-control'] == 'public, max-age=31536000, immutable'
    for url in ('/', '/static/dist/manifest.json', '/static/dist/missing.js'):
        response = await client.get(url)
        assert 'no-store' in response.headers['cache-control']


@pytest.mark.asyncio
async def test_template_scripts_are_local_or_inert_and_csp_forbids_eval(client):
    page = await client.get('/')
    script_policy = next(rule for rule in page.headers['content-security-policy'].split(';')
                         if rule.strip().startswith('script-src'))
    assert 'unsafe-eval' not in script_policy
    assert 'unsafe-inline' not in script_policy

    class Scripts(HTMLParser):
        def handle_starttag(self, tag, attrs):
            attributes = dict(attrs)
            if tag == 'script':
                assert (attributes.get('type') == 'application/json'
                        or attributes.get('src', '').startswith('/static/dist/'))
            assert not any(name.startswith('on') for name in attributes)

    Scripts().feed(page.text)
