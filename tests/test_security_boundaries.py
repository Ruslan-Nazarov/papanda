import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from starlette.requests import Request

from fastapi_app.main import app
from fastapi_app.config import settings
from fastapi_app.database import _engine_cache, _active_leases
from fastapi_app.rate_limiter import client_ip
from fastapi_app.services.security_store import database, reserve_budget, quota_stats
from fastapi_app.services.security_store import demo_instance_lock, session_for_cookie
from fastapi_app.tasks import cleanup_expired_sessions


@pytest.mark.asyncio
async def test_personal_access_and_cross_origin_writes_are_blocked(client):
    async with AsyncClient(transport=ASGITransport(app, client=('198.51.100.2', 1234)), base_url='http://127.0.0.1') as remote:
        assert (await remote.get('/api/dialectics')).status_code == 403
    assert (await client.get('/api/dialectics', headers={'host': 'attacker.example'})).status_code == 403
    assert (await client.get('/api/dialectics', headers={'x-forwarded-for': '127.0.0.1'})).status_code == 403
    assert (await client.post('/api/dialectics/save', headers={'origin': 'https://attacker.example'}, json={'title': 'x', 'blocks': []})).status_code == 403


def test_only_verified_proxy_chain_changes_quota_identity(monkeypatch):
    def request(peer, xff):
        return Request({'type': 'http', 'client': (peer, 1), 'headers': [(b'x-forwarded-for', xff.encode())]})
    monkeypatch.setattr(settings, 'TRUSTED_PROXY_COUNT', 1)
    monkeypatch.setattr(settings, 'TRUSTED_PROXY_IPS', '127.0.0.1/32')
    assert client_ip(request('198.51.100.2', '1.1.1.1')) == '198.51.100.2'
    assert client_ip(request('127.0.0.1', 'garbage')) == '127.0.0.1'
    assert client_ip(request('127.0.0.1', 'attacker, 1.1.1.1')) == '1.1.1.1'
    monkeypatch.setattr(settings, 'TRUSTED_PROXY_COUNT', 2)
    assert client_ip(request('127.0.0.1', '8.8.8.8, 198.51.100.9')) == '127.0.0.1'
    assert client_ip(request('127.0.0.1', '8.8.8.8, 127.0.0.1')) == '8.8.8.8'


@pytest.mark.asyncio
async def test_demo_sessions_own_every_database_object_and_expire(file_client, monkeypatch):
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    async with AsyncClient(transport=ASGITransport(app), base_url='http://127.0.0.1') as other:
        category = (await file_client.post('/api/dialectics/categories/new', json={'name': 'private'})).json()['id']
        first = (await file_client.post('/api/dialectics/save', json={'title': 'private', 'blocks': [], 'category_id': category})).json()['id']
        second = (await file_client.post('/api/dialectics/save', json={'title': 'linked', 'blocks': []})).json()['id']
        checkpoint = (await file_client.post(f'/api/dialectics/{first}/checkpoint', json={'title': 'private'})).json()['id']
        assert (await file_client.post(f'/api/dialectics/{first}/connections', json={'note_id_to': second})).status_code == 200
        assert (await other.get('/api/dialectics')).json() == []
        assert (await other.get('/api/dialectics/categories/all')).json() == []
        for path in (f'/{first}', f'/{first}/versions', f'/{first}/connections'):
            result = await other.get('/api/dialectics' + path)
            assert result.status_code == 404 or result.json() == []
        assert (await other.patch(f'/api/dialectics/{first}', json={'title': 'hacked'})).status_code == 404
        assert (await other.post(f'/api/dialectics/{first}/versions/{checkpoint}/restore')).status_code == 404
        assert (await other.put(f'/api/dialectics/categories/{category}', json={'name': 'hacked'})).status_code == 404
        # A guessed filename / legacy cookie cannot select another session's DB.
        sid = next(settings.DEMO_DIR.glob('*.db')).stem
        other.cookies.clear()
        other.cookies.set('session_id', sid)
        assert (await other.get('/api/dialectics')).json() == []
        with database() as db:
            db.execute('UPDATE sessions SET expires=?', (time.time() - 1,))
        await cleanup_expired_sessions()
        assert not list(settings.DEMO_DIR.glob('*.db'))
        assert not _engine_cache and not _active_leases
        assert (await file_client.get('/api/dialectics')).json() == []


def test_atomic_global_budget_survives_reopening_and_rejections_do_not_increment():
    def attempt(_):
        try:
            reserve_budget([('global', 5), ('session:one', 10)])
            return True
        except HTTPException as error:
            assert error.status_code == 429
            return False
    with ThreadPoolExecutor(max_workers=12) as pool:
        assert sum(pool.map(attempt, range(20))) == 5
    assert quota_stats()['global_today'] == 5
    with pytest.raises(HTTPException):
        reserve_budget([('global', 5), ('session:new', 10)])
    assert quota_stats()['global_today'] == 5


@pytest.mark.asyncio
async def test_oversized_body_rejected_before_route_for_length_and_chunks(client, monkeypatch):
    monkeypatch.setattr(settings, 'MAX_REQUEST_BYTES', 32)
    assert (await client.post('/api/dialectics/save', content=b'x' * 33)).status_code == 413
    async def chunks():
        yield b'x' * 20
        yield b'y' * 20
    assert (await client.post('/api/dialectics/save', content=chunks())).status_code == 413


@pytest.mark.asyncio
async def test_cleanup_defers_active_database(file_client, monkeypatch):
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    await file_client.get('/api/dialectics')
    url = next(iter(_engine_cache))
    with database() as db:
        db.execute('UPDATE sessions SET expires=0')
    _active_leases[url] = 1
    try:
        await cleanup_expired_sessions()
        assert url in _engine_cache
        assert list(settings.DEMO_DIR.glob('*.db'))
    finally:
        del _active_leases[url]
    await cleanup_expired_sessions()
    assert not _engine_cache


def test_demo_capacity_and_process_lock(monkeypatch):
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    monkeypatch.setattr(settings, 'DEMO_MAX_SESSIONS', 1)
    sid, token = session_for_cookie(None)
    assert session_for_cookie(token) == (sid, None)
    with pytest.raises(HTTPException) as exc:
        session_for_cookie('forged')
    assert exc.value.status_code == 503
    with demo_instance_lock():
        with pytest.raises(RuntimeError, match='one worker'):
            with demo_instance_lock():
                pass


@pytest.mark.asyncio
async def test_demo_storage_quota_blocks_writes_but_allows_reads_and_deletion(file_client, monkeypatch):
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    note = (await file_client.post('/api/dialectics/save', json={'title': 'one', 'blocks': []})).json()
    monkeypatch.setattr(settings, 'DEMO_MAX_DB_BYTES', 1)
    assert (await file_client.post('/api/dialectics/save', json={'title': 'two', 'blocks': []})).status_code == 413
    assert (await file_client.get(f"/api/dialectics/{note['id']}")).status_code == 200
    assert (await file_client.delete(f"/api/dialectics/{note['id']}/permanent")).status_code == 200


@pytest.mark.asyncio
async def test_https_origin_and_cookie_work_only_through_trusted_proxy(file_client, monkeypatch):
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    monkeypatch.setattr(settings, 'TRUSTED_PROXY_COUNT', 1)
    monkeypatch.setattr(settings, 'TRUSTED_PROXY_IPS', '127.0.0.1/32')
    response = await file_client.post('/api/dialectics/save', json={'title': 'proxy', 'blocks': []}, headers={
        'host': 'demo.example', 'origin': 'https://demo.example', 'x-forwarded-proto': 'https',
        'x-forwarded-for': '1.1.1.1',
    })
    assert response.status_code == 200
    assert 'Secure' in response.headers['set-cookie']
    monkeypatch.setattr(settings, 'TRUSTED_PROXY_IPS', '')
    assert (await file_client.post('/api/dialectics/save', json={'title': 'forged', 'blocks': []}, headers={
        'host': 'demo.example', 'origin': 'https://demo.example', 'x-forwarded-proto': 'https',
    })).status_code == 403
