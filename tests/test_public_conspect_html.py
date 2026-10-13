"""The published URLs must be useful to clients that never execute JavaScript."""
from html.parser import HTMLParser
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from fastapi_app.config import settings
from fastapi_app.main import app
from fastapi_app.services import deployed_library
from fastapi_app.services.public_conspect import _notice_html, _public_html


PUBLISHED_BUNDLE = Path(__file__).resolve().parents[1] / 'fastapi_app/data/library_notes.json'


class TextReader(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


@pytest.mark.asyncio
@pytest.mark.parametrize('slug,language,heading,phrase', [
    ('ecg-original', 'ru', 'ЭКГ', 'Как собрать одноканальный ЭКГ'),
    ('ecg-original', 'en', 'ECG — Initial Annotated Version', 'ADS1292 internal test generator'),
    ('ecg-final', 'ru', 'Как собрать одноканальный ЭКГ?', 'ADS1291'),
    ('ecg-final', 'en', 'How to Build a Single-Channel ECG Device', 'ADS1291'),
])
async def test_public_html_contains_complete_selected_language_without_authentication(
        monkeypatch, slug, language, heading, phrase):
    monkeypatch.setattr(deployed_library, 'LIBRARY_PATH', PUBLISHED_BUNDLE)
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    async with AsyncClient(transport=ASGITransport(app), base_url='http://127.0.0.1') as anonymous:
        response = await anonymous.get(f'/?conspect={slug}&lang={language}')
    assert response.status_code == 200
    html = response.text
    reader = TextReader()
    reader.feed(html)
    text = ' '.join(reader.parts)
    note = deployed_library.find_note(slug)['languages'][language]
    assert f'<html lang="{language}">' in html
    assert f'<h1>{heading}</h1>' in html
    assert phrase in text
    assert len(note['content_json']) == html.count('class="public-conspect-block"')
    assert note['dictionary'][-1]['definition'].split('\n')[0] in text
    assert 'id="btn-save"' in html  # The editor still ships on the same URL.
    assert f'<link rel="canonical" href="https://papanda.kz/?conspect={slug}&amp;lang={language}">' in html
    assert f'<meta property="og:url" content="https://papanda.kz/?conspect={slug}&amp;lang={language}">' in html
    assert '<meta property="og:image" content="https://papanda.kz/static/og/conspect.png">' in html
    assert '<meta name="description" content="' in html
    assert 'robots" content="noindex' not in html


@pytest.mark.asyncio
async def test_public_html_is_limited_to_deployed_bundle(client, monkeypatch):
    monkeypatch.setattr(deployed_library, 'LIBRARY_PATH', PUBLISHED_BUNDLE)
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    assert (await client.get('/?conspect=private-note&lang=en')).status_code == 404
    assert (await client.get('/?note=1&lang=en')).status_code == 200
    page = await client.get('/?note=1&lang=en')
    assert 'id="public-conspect"' not in page.text


@pytest.mark.asyncio
async def test_robots_and_sitemap_contain_only_published_languages(client, monkeypatch):
    monkeypatch.setattr(deployed_library, 'LIBRARY_PATH', PUBLISHED_BUNDLE)
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    robots = await client.get('/robots.txt')
    sitemap = await client.get('/sitemap.xml')
    assert robots.status_code == sitemap.status_code == 200
    assert 'Sitemap: https://papanda.kz/sitemap.xml' in robots.text
    assert sitemap.text.count('<url>') == 4
    image = await client.get('/static/og/conspect.png')
    assert image.status_code == 200 and image.headers['content-type'].startswith('image/png')
    for slug in ('ecg-original', 'ecg-final'):
        for language in ('ru', 'en'):
            assert f'conspect={slug}&amp;lang={language}' in sitemap.text


def test_public_html_keeps_safe_links_and_excludes_active_content(monkeypatch):
    monkeypatch.setattr(deployed_library, 'LIBRARY_PATH', PUBLISHED_BUNDLE)
    html = (_public_html('<p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>'
                         '<a href="internal://note/23/block/block-xwdexxa">published</a>'
                         '<a href="internal://note/999">private</a>'
                         '<a href="https://example.org/source">source</a></p>', 'ru'))
    assert '<script' not in html and 'javascript:' not in html
    assert 'href="/?conspect=ecg-original&amp;lang=ru#block-xwdexxa"' in html
    assert 'href="internal://note/999"' not in html
    assert 'href="https://example.org/source"' in html
    assert '<a href="/static/showcase/ecg/original-ai-ru.pdf">PDF</a>' in _notice_html(
        '[PDF](/static/showcase/ecg/original-ai-ru.pdf)')
