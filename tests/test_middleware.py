import pytest
from httpx import AsyncClient, ASGITransport
from fastapi_app.main import app
from fastapi_app.database import get_db

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_security_headers_middleware(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "Strict-Transport-Security" in res.headers
    csp = res.headers.get("Content-Security-Policy", "")
    assert "default-src 'self'" in csp
    assert "object-src 'none'" in csp
    assert "frame-ancestors 'none'" in csp
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


@pytest.mark.asyncio
async def test_session_middleware_generates_cookie():
    transport = ASGITransport(app=app)
    # Request without cookies
    async with AsyncClient(transport=transport, base_url="http://test") as clean_client:
        res = await clean_client.get("/health")
        assert res.status_code == 200
        assert "session_id" in res.cookies
        session_id = res.cookies["session_id"]
        assert session_id is not None and len(session_id) > 10


@pytest.mark.asyncio
async def test_session_middleware_preserves_existing_cookie():
    transport = ASGITransport(app=app)
    existing_session = "custom-session-uuid-456"
    async with AsyncClient(transport=transport, base_url="http://test", cookies={"session_id": existing_session}) as client_with_cookie:
        res = await client_with_cookie.get("/health")
        assert res.status_code == 200
        # Cookie does not need to be overwritten if already set
        assert client_with_cookie.cookies.get("session_id") == existing_session


@pytest.mark.asyncio
async def test_locale_middleware_and_index_page():
    transport = ASGITransport(app=app)
    
    # 1. Russian default / header
    async with AsyncClient(transport=transport, base_url="http://test", headers={"Accept-Language": "ru-RU,ru;q=0.9"}) as ru_client:
        res = await ru_client.get("/")
        assert res.status_code == 200
        assert "Конспекты" in res.text or "lang_ru" in res.text
        
    # 2. English header
    async with AsyncClient(transport=transport, base_url="http://test", headers={"Accept-Language": "en-US,en;q=0.9"}) as en_client:
        res = await en_client.get("/")
        assert res.status_code == 200
        assert "Notes" in res.text or "lang_en" in res.text

    # 3. Kazakh cookie
    async with AsyncClient(transport=transport, base_url="http://test", cookies={"locale": "kz"}) as kz_client:
        res = await kz_client.get("/")
        assert res.status_code == 200
        assert "Конспекттер" in res.text or "lang_kz" in res.text


@pytest.mark.asyncio
async def test_nocache_static_middleware(client: AsyncClient):
    res = await client.get("/static/css/notes.css")
    assert res.status_code == 200
    assert res.headers.get("Cache-Control") == "no-store, no-cache, must-revalidate, max-age=0"
    assert res.headers.get("Pragma") == "no-cache"


@pytest.mark.asyncio
async def test_editor_redirect(client: AsyncClient):
    res = await client.get("/editor", follow_redirects=False)
    assert res.status_code == 307
    assert res.headers.get("location") == "/"
