from uuid import uuid4

import httpx
import pytest

from fastapi_app.config import settings
from fastapi_app.services import library_store
from fastapi_app.routers import library


@pytest.fixture(autouse=True)
def local_publishing(monkeypatch):
    monkeypatch.setattr(settings, 'LIBRARY_PUBLISH_URL', '')
    monkeypatch.setattr(settings, 'LIBRARY_PUBLISH_KEY', '')


async def create_note(client):
    response = await client.post('/api/dialectics/save', json={
        'title': 'Example', 'blocks': [{'id': 'block1', 'side': 'center', 'role': 'anchor',
            'anchorResolved': True, 'html': '<p>Original</p>',
            'tabs': [{'private': 'secret tab'}], 'words': [{'word': 'private', 'definition': 'secret'}]}],
        'stickers': [{'id': 'sticker1', 'title': 'private', 'text': 'secret sticker'}]})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.asyncio
async def test_preview_snapshot_update_and_unpublish(client):
    note = await create_note(client)
    note_id = note['id']
    preview = await client.get(f'/author/library/{note_id}/preview', params={'revision': note['revision']})
    assert preview.status_code == 200
    assert 'Original' in preview.text and 'secret' not in preview.text
    assert 'library-copy' not in preview.text.split('<body')[1]  # no copy action on preview
    assert (await client.get('/api/library')).json() == []
    state = (await client.get(f'/api/author/library/{note_id}')).json()
    endpoint = f'/api/author/library/{note_id}'
    published = await client.put(endpoint, json={'revision': note['revision'], 'description': 'Introduction'})
    assert published.status_code == 200
    url = published.json()['url']
    assert state['id'] in url
    stored = library_store.get_publication(state['id'])
    assert stored['blocks'][0]['anchorResolved'] is True
    assert 'secret' not in str(stored) and 'stickers' not in stored
    page = await client.get('/library')
    assert 'Introduction' in page.text and url in page.text
    changed = (await client.patch(f'/api/dialectics/{note_id}', json={
        'revision': note['revision'], 'title': 'Working draft'})).json()
    assert 'Example' in (await client.get(url)).text
    assert (await client.put(endpoint, json={'revision': note['revision']})).status_code == 409
    assert (await client.get(f'/author/library/{note_id}/preview', params={'revision': note['revision']})).status_code == 409
    updated = await client.put(endpoint, json={'revision': changed['revision'], 'description': 'Updated'})
    assert updated.json()['url'] == url
    assert len((await client.get('/api/library')).json()) == 1
    assert 'Working draft' in (await client.get(url)).text
    assert (await client.delete(endpoint)).status_code == 200
    assert (await client.get(url)).status_code == 404
    assert (await client.get(f'/api/dialectics/{note_id}')).status_code == 200


@pytest.mark.asyncio
async def test_copy_is_independent_and_private(client):
    note = await create_note(client)
    url = (await client.put(f"/api/author/library/{note['id']}", json={'revision': note['revision']})).json()['url']
    pid = url.split('/')[-1]
    copied = await client.post(f'/api/library/{pid}/copy')
    assert copied.status_code == 200
    copy = copied.json()
    assert copy['id'] != note['id'] and copy['stickers'] == [] and not copy['is_example']
    assert copy['content_json'][0]['html'] == '<p>Original</p>'
    await client.patch(f"/api/dialectics/{copy['id']}", json={'revision': copy['revision'], 'title': 'My copy'})
    assert 'My copy' not in (await client.get(url)).text
    assert (await client.post(f'/api/library/{uuid4()}/copy')).status_code == 404


@pytest.mark.asyncio
async def test_server_hides_author_controls_and_requires_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    monkeypatch.setattr(settings, 'LIBRARY_PUBLISH_KEY', 'server-key')
    page = await client.get('/')
    assert page.status_code == 200 and 'btn-library-publish' not in page.text
    assert '/library' in page.text
    for method, path in [('GET', '/api/author/library/1'), ('PUT', '/api/author/library/1'),
                         ('DELETE', '/api/author/library/1'), ('GET', '/author/library/1/preview?revision=1')]:
        response = await client.request(method, path, json={'revision': 1} if method == 'PUT' else None)
        assert response.status_code == 404
    pid = str(uuid4())
    endpoint = f'/api/library/publications/{pid}'
    payload = {'title': 'Public example', 'blocks': [{'id': 'one', 'html': '<p>Hello</p><script>alert(1)</script>',
        'tabs': {'private': True}}]}
    for headers in ({}, {'Authorization': 'Bearer wrong-key'}):
        assert (await client.put(endpoint, json=payload, headers=headers)).status_code == 401
        assert (await client.delete(endpoint, headers=headers)).status_code == 401
    headers = {'Authorization': 'Bearer server-key'}
    response = await client.put(endpoint, json=payload, headers=headers)
    assert response.status_code == 200
    assert 'set-cookie' not in response.headers
    stored = library_store.get_publication(pid)
    assert '<script' not in stored['blocks'][0]['html'] and 'tabs' not in stored['blocks'][0]
    assert (await client.get('/api/library')).json()[0]['id'] == pid
    assert (await client.get(f'/library/{pid}')).status_code == 200
    assert (await client.delete(endpoint, headers=headers)).status_code == 200
    assert (await client.delete(endpoint, headers=headers)).status_code == 200
    monkeypatch.setattr(settings, 'LIBRARY_PUBLISH_KEY', '')
    assert (await client.put(endpoint, json=payload, headers=headers)).status_code == 404


@pytest.mark.asyncio
async def test_remote_delivery_retries_keep_identity_and_secret_backend_only(client, monkeypatch):
    note = await create_note(client)
    monkeypatch.setattr(settings, 'LIBRARY_PUBLISH_URL', 'https://example.test')
    monkeypatch.setattr(settings, 'LIBRARY_PUBLISH_KEY', 'publish-secret')
    real_client = httpx.AsyncClient
    requests = []
    fail = True

    def receive(request):
        requests.append(request)
        return httpx.Response(503 if fail else 200, json={'ok': not fail})

    monkeypatch.setattr(library.httpx, 'AsyncClient', lambda **kwargs:
        real_client(transport=httpx.MockTransport(receive), **kwargs))
    endpoint = f"/api/author/library/{note['id']}"
    assert (await client.put(endpoint, json={'revision': note['revision']})).status_code == 502
    assert not (await client.get(endpoint)).json()['published']
    fail = False
    published = await client.put(endpoint, json={'revision': note['revision']})
    assert published.status_code == 200
    assert requests[0].url == requests[1].url
    assert requests[1].headers['authorization'] == 'Bearer publish-secret'
    assert 'secret' not in str((await client.get(endpoint)).json())
    assert (await client.get('/api/library')).json() == []  # remote delivery never fills local shelf
    assert (await client.delete(endpoint)).status_code == 200
    assert requests[-1].method == 'DELETE'
    monkeypatch.setattr(settings, 'LIBRARY_PUBLISH_URL', 'http://example.test')
    assert (await client.get(endpoint)).status_code == 503


@pytest.mark.asyncio
async def test_public_library_does_not_allocate_demo_session(file_client, monkeypatch):
    library_store.put_publication(str(uuid4()), {'title': 'Persisted', 'description': '',
        'schema_version': 1, 'blocks': [{'id': 'one', 'html': '<p>Public</p>'}]})
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    for path in ('/library', '/api/library'):
        response = await file_client.get(path)
        assert response.status_code == 200 and 'Persisted' in response.text
        assert 'set-cookie' not in response.headers
    assert not settings.DEMO_DIR.exists()


@pytest.mark.asyncio
async def test_invalid_and_empty_publication_rejected(client):
    empty = (await client.post('/api/dialectics/save', json={'title': '', 'blocks': []})).json()
    assert (await client.put(f"/api/author/library/{empty['id']}", json={'revision': empty['revision']})).status_code == 422
    assert (await client.get('/')).status_code == 200
    assert 'btn-library-publish' in (await client.get('/')).text
