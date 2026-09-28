import asyncio
import hashlib
import sqlite3
import time
import uuid

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from fastapi_app.config import settings
from fastapi_app.main import app
from fastapi_app.services import security_store as store
from fastapi_app.tasks import cleanup_expired_sessions


@pytest.mark.asyncio
async def test_public_pages_and_missing_api_do_not_allocate_at_capacity(file_client, monkeypatch):
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    monkeypatch.setattr(settings, 'DEMO_MAX_SESSIONS', 1)
    store.session_for_cookie(None)
    async with AsyncClient(transport=ASGITransport(app), base_url='http://127.0.0.1') as visitor:
        for path, expected in [('/', 200), ('/privacy', 200), ('/robots.txt', 404),
                               ('/api/no-such-route', 404)]:
            response = await visitor.get(path)
            assert response.status_code == expected
            if path != '/':
                assert 'session_id' not in response.cookies
    with store.database() as db:
        assert db.execute('SELECT count(*) FROM sessions').fetchone()[0] == 1


@pytest.mark.asyncio
async def test_working_notes_survive_expiry_and_cookie_is_renewed(file_client, monkeypatch):
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    title = 'Long title ' * 40
    response = await file_client.post('/api/dialectics/save', json={'title': title, 'blocks': []})
    assert response.status_code == 200
    token = response.cookies.get('session_id')
    with store.database() as db:
        db.execute('UPDATE sessions SET expires=1')
    await cleanup_expired_sessions()
    response = await file_client.get('/api/dialectics')
    assert response.json()[0]['title'] == title
    assert response.cookies.get('session_id') == token
    with store.database() as db:
        assert db.execute('SELECT expires FROM sessions').fetchone()[0] > time.time()


def test_activity_renews_server_expiry(monkeypatch):
    monkeypatch.setattr(settings, 'DEMO_SESSION_TTL_SECONDS', 60)
    monkeypatch.setattr(store.time, 'time', lambda: 1000)
    sid, token = store.session_for_cookie(None)
    monkeypatch.setattr(store.time, 'time', lambda: 1059)
    assert store.session_for_cookie(token) == (sid, token)
    with store.database() as db:
        assert db.execute('SELECT expires FROM sessions WHERE id=?', (sid,)).fetchone()[0] == 1119


def test_parallel_first_requests_share_identity_and_forgery_cannot_claim_it():
    from concurrent.futures import ThreadPoolExecutor
    token = store.pending_cookie()
    with ThreadPoolExecutor(max_workers=4) as pool:
        sessions = list(pool.map(store.session_for_cookie, [token] * 4))
    assert len({sid for sid, _ in sessions}) == 1
    with store.database() as db:
        assert db.execute('SELECT count(*) FROM sessions').fetchone()[0] == 1
    forged = token[:-1] + ('a' if token[-1] != 'a' else 'b')
    assert store.session_for_cookie(forged)[0] != sessions[0][0]


def test_legacy_recovery_requires_original_cookie_and_never_overwrites(tmp_path):
    settings.DEMO_DIR.mkdir(parents=True)
    token = str(uuid.uuid4())
    source = settings.DEMO_DIR / f'{token}.db'
    with sqlite3.connect(source) as db:
        db.execute('CREATE TABLE fixture (value TEXT)')
        db.execute("INSERT INTO fixture VALUES ('original')")
    sid, cookie = store.session_for_cookie(token)
    assert sid == hashlib.sha256(token.encode()).hexdigest() and cookie == token
    target = settings.DEMO_DIR / f'{sid}.db'
    with sqlite3.connect(target) as db:
        assert db.execute('SELECT value FROM fixture').fetchone()[0] == 'original'
        db.execute("UPDATE fixture SET value='later edit'")
    assert store.session_for_cookie(token)[0] == sid
    with sqlite3.connect(target) as db:
        assert db.execute('SELECT value FROM fixture').fetchone()[0] == 'later edit'
    with sqlite3.connect(source) as db:
        assert db.execute('SELECT value FROM fixture').fetchone()[0] == 'original'
    assert store.session_for_cookie(sid)[0] != sid
    assert store.session_for_cookie('../' + token)[0] != sid


@pytest.mark.asyncio
async def test_v3_stream_close_cancels_builder(monkeypatch):
    from fastapi_app.services.generation import dialectic_v3_pipeline as module
    started, stopped = asyncio.Event(), asyncio.Event()
    async def build(domain, ctx):
        started.set()
        try:
            await ctx.on_event('FindP0', {})
            await asyncio.Event().wait()
        finally:
            stopped.set()
    monkeypatch.setattr(module, 'build_world', build)
    monkeypatch.setattr(module, 'build_llm', lambda spec: object())
    monkeypatch.setattr(settings, 'GROQ_API_KEY', 'fixture')
    stream = module.DialecticV3Pipeline().stream_generate_full({'target_goal': 'fixture'}, 'ru')
    await anext(stream)
    assert started.is_set()
    await stream.aclose()
    assert stopped.is_set()


@pytest.mark.asyncio
async def test_v3_context_reaches_model_and_budget_stops_fallback(monkeypatch):
    from dialectic_world.llm.base import LLM, FallbackLLM
    from fastapi_app.services.generation.dialectic_llm import DialecticLLM
    from fastapi_app.services.generation.runtime import GenerationContext, generation_scope, BudgetExceeded
    seen = []
    class FailingLLM(LLM):
        async def _complete(self, messages):
            seen.extend(messages)
            raise RuntimeError('fixture unavailable')
    llm = DialecticLLM(FallbackLLM([FailingLLM(model='one'), FailingLLM(model='two')]),
                       {'reference_document': 'source marker', 'user_question': 'question marker'})
    context = GenerationContext(max_calls=1)
    async with generation_scope(context):
        with pytest.raises(BudgetExceeded):
            await llm.generate([{'role': 'user', 'content': 'authored prompt'}])
    assert len(context.calls) == 1 and context.calls[0]['status'] == 'failed'
    assert seen[0]['content'] == 'authored prompt'
    assert 'source marker' in seen[1]['content'] and 'question marker' in seen[1]['content']


@pytest.mark.asyncio
async def test_v3_http_is_cancellable_and_each_retry_is_counted():
    from dialectic_world.llm.providers import OpenAICompatible
    from fastapi_app.services.generation.dialectic_llm import DialecticLLM
    from fastapi_app.services.generation.runtime import GenerationContext, generation_scope, BudgetExceeded
    provider = OpenAICompatible('fixture', 'https://fixture.invalid', 'fixture')
    llm = DialecticLLM(provider)
    received = []
    async def handler(request):
        received.append(request)
        return httpx.Response(429)
    llm.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    context = GenerationContext(max_calls=1)
    try:
        async with generation_scope(context):
            with pytest.raises(BudgetExceeded):
                await llm.generate([{'role': 'user', 'content': 'fixture'}])
        assert len(received) == len(context.calls) == 1
    finally:
        await llm.aclose()


@pytest.mark.asyncio
async def test_v3_all_actions_use_selected_engine_and_reference_survives_validation(monkeypatch):
    from fastapi_app.services.ai_router_service import ConspectusRouter
    from fastapi_app.routers.ai import ConspectusRouteRequest
    monkeypatch.setattr(settings, 'GENERATION_ENGINE', 'dialectic_v3')
    router = ConspectusRouter(None, None, None, None)
    calls = []
    async def source(state, locale, **kwargs):
        calls.append((state, kwargs))
        yield '__terminal__', {'status': 'completed'}
    monkeypatch.setattr(router.full_pipeline, 'stream_generate_full', source)
    data = ConspectusRouteRequest(action='generate_step', target_step='2',
        context_state={'target_goal': 'fixture', 'reference': 'document'}, question='clarify')
    await router.route_request(data.model_dump())
    assert calls[0][0]['reference'] == 'document'
    assert calls[0][1]['target_step'] == 2 and calls[0][1]['question'] == 'clarify'


@pytest.mark.asyncio
async def test_recovery_rehearsal_then_apply_preserves_note_and_owner(file_client, monkeypatch):
    from contextlib import closing
    from scripts.recover_legacy_sessions import recover
    from fastapi_app.database import dispose_all_engines
    original = (await file_client.post('/api/dialectics/save', json={'title': 'legacy fixture', 'blocks': []})).json()
    await dispose_all_engines()
    settings.DEMO_DIR.mkdir(parents=True, exist_ok=True)
    cookie = str(uuid.uuid4())
    legacy = settings.DEMO_DIR / f'{cookie}.db'
    with closing(sqlite3.connect(settings.DB_DIR / 'papanda.db')) as source:
        with closing(sqlite3.connect(legacy)) as target:
            source.backup(target)
    result = await recover(settings.DATA_DIR)
    assert result == {'verified_databases': 1, 'legacy_notes': 1, 'applied': False}
    assert not (settings.DATA_DIR / 'security.sqlite3').exists()
    assert (await recover(settings.DATA_DIR, apply=True))['applied'] is True
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    file_client.cookies.clear()
    file_client.cookies.set('session_id', cookie)
    response = await file_client.get(f"/api/dialectics/{original['id']}")
    assert response.status_code == 200 and response.json()['title'] == 'legacy fixture'
    assert legacy.exists()


@pytest.mark.asyncio
async def test_v3_cancellation_closes_pending_http():
    from dialectic_world.llm.providers import OpenAICompatible
    from fastapi_app.services.generation.dialectic_llm import DialecticLLM
    from fastapi_app.services.generation.runtime import GenerationContext, generation_scope
    started, stopped = asyncio.Event(), asyncio.Event()
    async def handler(request):
        started.set()
        try:
            await asyncio.Event().wait()
        finally:
            stopped.set()
    llm = DialecticLLM(OpenAICompatible('fixture', 'https://fixture.invalid', 'fixture'))
    llm.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    run = GenerationContext()
    try:
        async with generation_scope(run):
            task = asyncio.create_task(llm.generate([{'role': 'user', 'content': 'fixture'}]))
            await started.wait()
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
        assert stopped.is_set() and run.calls[0]['status'] == 'cancelled'
    finally:
        await llm.aclose()
