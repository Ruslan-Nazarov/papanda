import pytest
from httpx import AsyncClient
from httpx import ASGITransport
from fastapi_app.main import app
from fastapi_app.config import settings
from fastapi_app.database import dispose_all_engines, initialize_databases
from fastapi_app.services.security_store import database


@pytest.mark.asyncio
async def test_version_material_is_fixed_and_locked(client: AsyncClient):
    created = await client.post('/api/dialectics/save', json={
        'title': 'ЭКГ', 'blocks': [{'id': 'block-1', 'side': 'left', 'html': '<p>Первый текст</p>'}]})
    assert created.status_code == 200, created.text
    note = created.json()
    note_id = note['id']
    version = (await client.get(f'/api/dialectics/{note_id}/versions')).json()[0]
    promoted = await client.post(f'/api/dialectics/{note_id}/versions/{version["id"]}/material')
    assert promoted.status_code == 200, promoted.text
    token = promoted.json()['material_token']
    assert token and promoted.json()['is_manual']
    assert (await client.post(f'/api/dialectics/{note_id}/versions/{version["id"]}/material')).json()['material_token'] == token
    material = (await client.get(f'/api/dialectics/{note_id}/materials')).json()[0]
    assert material['material_token'] == token
    assert 'content_json' not in material

    changed = await client.patch(f'/api/dialectics/{note_id}', json={
        'revision': note['revision'], 'blocks': [{'id': 'block-1', 'side': 'left', 'html': '<p>Новый текст</p>'}]})
    assert changed.status_code == 200, changed.text
    public = await client.get(f'/api/dialectics/shared-material/{token}')
    assert public.status_code == 200, public.text
    assert 'Первый текст' in public.text and 'Новый текст' not in public.text
    page = await client.get(f'/v/{token}')
    assert page.status_code == 200, page.text
    assert 'Первый текст' in page.text and 'Новый текст' not in page.text

    base = f'/api/dialectics/{note_id}/versions/{version["id"]}'
    assert (await client.delete(base)).status_code == 409
    assert (await client.post(base + '/unpin')).status_code == 409
    assert (await client.delete(f'/api/dialectics/{note_id}')).status_code == 409
    assert (await client.delete(f'/api/dialectics/{note_id}/permanent')).status_code == 409

    removed = await client.delete(base + '/material')
    assert removed.status_code == 200, removed.text
    assert removed.json()['material_token'] is None
    assert (await client.get(f'/v/{token}')).status_code == 404
    assert (await client.delete(base)).status_code == 200


@pytest.mark.asyncio
async def test_material_public_link_is_reindexed_after_demo_restart(file_client: AsyncClient, monkeypatch):
    await dispose_all_engines()
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    note = (await file_client.post('/api/dialectics/save', json={
        'title': 'Снимок', 'blocks': [{'id': 'b1', 'side': 'left', 'html': '<p>Зафиксировано</p>'}]})).json()
    version = (await file_client.get(f'/api/dialectics/{note["id"]}/versions')).json()[0]
    promoted = await file_client.post(f'/api/dialectics/{note["id"]}/versions/{version["id"]}/material')
    assert promoted.status_code == 200, promoted.text
    token = promoted.json()['material_token']
    with database() as registry:
        registry.execute('DELETE FROM shares WHERE token=?', (token,))
    await dispose_all_engines()
    await initialize_databases()
    async with AsyncClient(transport=ASGITransport(app), base_url='http://127.0.0.1') as visitor:
        page = await visitor.get(f'/v/{token}')
        assert page.status_code == 200, page.text
        assert 'Зафиксировано' in page.text
        assert page.headers['cache-control'] == 'no-store'
        assert 'session_id' not in visitor.cookies
