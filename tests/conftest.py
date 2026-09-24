import os

# Set these before importing the app: a developer's .env must never enable
# real provider calls or secret-file writes during the test suite.
for key in ("GROQ_API_KEY", "OPENROUTER_API_KEY", "SAMBANOVA_API_KEY",
            "CEREBRAS_API_KEY", "HUGGINGFACE_API_KEY", "GOOGLE_API_KEY",
            "GIGACHAT_AUTH_KEY"):
    os.environ[key] = ""
os.environ["SECRET_KEY"] = "test-only-secret"
os.environ["GIGACHAT_VERIFY_SSL"] = "true"
os.environ["GIGACHAT_CA_BUNDLE"] = ""

import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from fastapi_app.main import app
from fastapi_app.database import Base, get_db, get_public_db, create_db_engine
from fastapi_app.config import settings

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(autouse=True)
def isolated_data_settings(tmp_path, monkeypatch):
    """Even lifespan/startup must use disposable data, never the user's DB."""
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)
    monkeypatch.setattr(settings, "DATA_DIR", tmp_path / "data")
    monkeypatch.setattr(settings, "DB_DIR", tmp_path / "data" / "db")
    monkeypatch.setattr(settings, "DEMO_DIR", tmp_path / "data" / "demo")
    monkeypatch.setattr(settings, "DATABASE_URL", "")
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    monkeypatch.setattr(settings, "SECRET_KEY", "test-only-secret")

@pytest_asyncio.fixture
async def test_engine():
    engine = create_db_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    async_session = async_sessionmaker(test_engine, expire_on_commit=False)
    async with async_session() as session:
        yield session

@pytest_asyncio.fixture
async def client(test_engine) -> AsyncGenerator[AsyncClient, None]:
    async_session = async_sessionmaker(test_engine, expire_on_commit=False)
    
    async def override_get_db():
        async with async_session() as session:
            yield session
            
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_public_db] = override_get_db
    
    # Disable rate limiting for testing
    from fastapi_app.rate_limiter import limiter
    previous_enabled = limiter.enabled
    limiter.enabled = False
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://127.0.0.1", cookies={"session_id": "test-session-123"}) as ac:
            yield ac
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_public_db, None)
        limiter.enabled = previous_enabled


@pytest_asyncio.fixture
async def file_client(isolated_data_settings):
    """Real startup/shutdown and get_db; only paths and rate limiting differ."""
    from fastapi_app.database import dispose_all_engines
    from fastapi_app.rate_limiter import limiter

    previous_enabled = limiter.enabled
    limiter.enabled = False
    await dispose_all_engines()
    try:
        async with app.router.lifespan_context(app):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://127.0.0.1",
                cookies={"session_id": "integration-session"},
            ) as ac:
                yield ac
    finally:
        await dispose_all_engines()
        limiter.enabled = previous_enabled
