import base64

import pytest

from fastapi_app.schemas.notes import NoteBlock
from fastapi_app.services.sanitizer import (
    MAX_EMBEDDED_IMAGE_BYTES, sanitize_block_html, sanitize_on_write,
)

PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='


def test_embedded_image_survives_both_sanitizers_without_active_attributes():
    html = f'<p>Diagram</p><img src="{PNG}" alt="drawing" width="540" onerror="bad()">'
    for clean in (sanitize_on_write, sanitize_block_html):
        result = clean(html)
        assert f'src="{PNG}"' in result
        assert 'alt="drawing"' in result and 'width="540"' in result
        assert 'onerror' not in result


@pytest.mark.parametrize('src', [
    'data:image/svg+xml;base64,PHN2Zy8+',
    'data:image/png;base64,PHNjcmlwdD4=',  # declared PNG, actual HTML
    'data:image/png;base64,%%%invalid',
    'https://example.org/remote.png',
    'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\n' + b'x' * MAX_EMBEDDED_IMAGE_BYTES).decode(),
], ids=['svg', 'wrong-mime', 'invalid-base64', 'remote', 'oversize'])
def test_invalid_image_rejected_at_write_boundary_and_stripped_in_legacy_read(src):
    html = f'<img src="{src}">'
    with pytest.raises(ValueError, match='embedded PNG'):
        NoteBlock(side='left', html=html)
    assert 'src=' not in sanitize_block_html(html)


def test_data_scheme_is_not_enabled_on_links():
    for href in ('data:text/html;base64,PHNjcmlwdD4=', 'd&#97;ta:text/html,evil', 'da&#10;ta:text/html,evil'):
        assert 'href=' not in sanitize_on_write(f'<a href="{href}">x</a>')


@pytest.mark.asyncio
async def test_image_roundtrip_update_checkpoint_restore_and_public_page(client):
    blocks = [{'id': 'drawing', 'role': 'step1', 'side': 'left', 'html': f'<img src="{PNG}" alt="drawing">'}]
    saved = await client.post('/api/dialectics/save', json={'title': 'Drawing', 'blocks': blocks})
    assert saved.status_code == 200, saved.text
    note_id = saved.json()['id']
    url = f'/api/dialectics/{note_id}'
    update = await client.patch(url, json={'blocks': saved.json()['content_json']})
    assert update.status_code == 200 and PNG in update.json()['content_json'][0]['html']
    checkpoint = await client.post(url + '/checkpoint', json={'title': 'With drawing', 'is_manual': True})
    assert checkpoint.status_code == 200 and PNG in checkpoint.json()['content_json'][0]['html']
    assert (await client.patch(url, json={'blocks': []})).status_code == 200
    restored = await client.post(url + f"/versions/{checkpoint.json()['id']}/restore")
    assert restored.status_code == 200 and PNG in restored.json()['content_json'][0]['html']
    shared = await client.post(url + '/share')
    public = await client.get(shared.json()['path'])
    assert public.status_code == 200 and PNG in public.text

    invalid = await client.patch(url, json={'title': 'Must not save', 'blocks': [
        {**blocks[0], 'html': '<img src="data:image/svg+xml;base64,PHN2Zy8+">'},
    ]})
    assert invalid.status_code == 422
    loaded = (await client.get(url)).json()
    assert loaded['title'] == restored.json()['title']
    assert PNG in loaded['content_json'][0]['html']
