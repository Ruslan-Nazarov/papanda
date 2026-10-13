"""Read-only HTML view of author-selected, deployed library notes."""
import re
from html import escape
from textwrap import shorten
from urllib.parse import quote, urlsplit

from markupsafe import Markup

from fastapi_app.routers.library import public_block_data
from fastapi_app.services.deployed_library import find_note, read_library
from fastapi_app.services.sanitizer import sanitize_block_html


PUBLIC_ORIGIN = 'https://papanda.kz'
_MARKDOWN_LINK = re.compile(r'\[([^\]\n]+)\]\((/[^\s)]+|https://[^\s)]+)\)')
_INTERNAL_LINK = re.compile(r'href="internal://note/([0-9]+)(?:/block/([A-Za-z0-9_-]+))?"')


def public_url(value):
    """Accept ordinary web links and explicitly public local links only."""
    if not isinstance(value, str):
        return None
    parts = urlsplit(value)
    if parts.scheme in {'http', 'https'} and parts.hostname and not (parts.username or parts.password):
        return value
    if (not parts.scheme and not parts.netloc and value.startswith('/')
            and not value.startswith(('/\\', '//'))
            and (parts.path == '/' and parts.query.startswith('conspect=')
                 or parts.path.startswith('/static/'))):
        return value
    return None


def _notice_html(text):
    """Render only simple public Markdown links; escape everything else."""
    parts = []
    offset = 0
    for match in _MARKDOWN_LINK.finditer(text or ''):
        parts.append(escape(text[offset:match.start()]))
        target = match[2]
        if not public_url(target):
            parts.append(escape(match[0]))
        else:
            parts.append(f'<a href="{escape(target, quote=True)}">{escape(match[1])}</a>')
        offset = match.end()
    parts.append(escape((text or '')[offset:]))
    return Markup(''.join(parts).replace('\n', '<br>'))


def _public_html(html, language):
    catalog = {str(item.get('source_note_id')): item for item in read_library()['notes']}

    def link(match):
        item = catalog.get(match[1])
        if not item or language not in item['languages']:
            return ''
        target = f"/?conspect={quote(item['slug'])}&lang={language}"
        if match[2]:
            target += '#' + quote(match[2])
        return f'href="{target}"'

    return sanitize_block_html(_INTERNAL_LINK.sub(link, html or ''), allow_public_links=True)


def public_conspect(slug, language):
    """Return only content deliberately included in the deployed public bundle."""
    item = find_note(slug)
    if language not in item['languages']:
        return None
    source = item['languages'][language]
    blocks = []
    for raw in source['content_json']:
        if not isinstance(raw, dict):
            continue
        block = public_block_data(raw)
        block['html'] = _public_html(block.get('html'), language)
        for field in ('rejected_drafts', 'derivations'):
            block[field] = [{**part, 'html': _public_html(part.get('html'), language)}
                            for part in block[field] if isinstance(part, dict)]
        blocks.append(block)
    description = item.get('description', {}).get(language) or (source.get('note_notice') or '').split('\n')[0]
    canonical = f'{PUBLIC_ORIGIN}/?conspect={quote(slug)}&lang={language}'
    alternate = 'en' if language == 'ru' else 'ru'
    return {
        'title': source['title'], 'description': shorten(description, width=300, placeholder='…'), 'language': language,
        'canonical': canonical, 'alternate_language': alternate,
        'alternate_url': f'{PUBLIC_ORIGIN}/?conspect={quote(slug)}&lang={alternate}' if alternate in item['languages'] else None,
        'image': f'{PUBLIC_ORIGIN}/static/og/conspect.png',
        'notice': _notice_html(source.get('note_notice', '')),
        'blocks': blocks, 'stickers': source.get('stickers') or [],
        'dictionary': source.get('dictionary') or [],
    }
