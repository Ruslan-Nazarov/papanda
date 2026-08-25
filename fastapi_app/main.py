import uuid
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path

from fastapi_app.routers import notes, ai
from fastapi_app.config import settings
from fastapi_app.middleware import (
    SessionMiddleware, 
    SecurityHeadersMiddleware, 
    LocaleMiddleware, 
    NoCacheStaticMiddleware
)
from fastapi_app.tasks import cleanup_old_dbs
from fastapi_app.i18n import get_translator

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import asyncio

from fastapi_app.rate_limiter import limiter

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(cleanup_old_dbs())
    yield
    task.cancel()

app = FastAPI(title="Notes App", version="0.7.7", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(SessionMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LocaleMiddleware)
app.add_middleware(NoCacheStaticMiddleware)

# Mount static
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Templates
templates_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=templates_dir)

# Routers
app.include_router(notes.router, prefix="/api/dialectics", tags=["notes"])
app.include_router(ai.router, prefix="/api/ai/dialectics", tags=["ai"])

@app.get("/", response_class=HTMLResponse)
async def portal_index(request: Request):
    locale = getattr(request.state, "locale", "ru")
    _ = get_translator(locale)
    return templates.TemplateResponse(request=request, name="portal_index.html", context={"_": _, "locale": locale})

@app.get("/editor", response_class=HTMLResponse)
async def editor(request: Request):
    locale = getattr(request.state, "locale", "ru")
    _ = get_translator(locale)
    return templates.TemplateResponse(request=request, name="index.html", context={"_": _, "locale": locale})

@app.get("/read/{note_id}", response_class=HTMLResponse)
async def portal_read(request: Request, note_id: str):
    locale = getattr(request.state, "locale", "ru")
    _ = get_translator(locale)
    return templates.TemplateResponse(request=request, name="portal_read.html", context={"_": _, "locale": locale, "note_id": note_id})

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/changelog")
async def get_changelog():
    from fastapi.responses import FileResponse
    changelog_path = Path(__file__).parent.parent / "CHANGELOG.md"
    if changelog_path.exists():
        return FileResponse(changelog_path)
    return JSONResponse(status_code=404, content={"error": "Changelog not found"})
