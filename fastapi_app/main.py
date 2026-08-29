import uuid
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
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

from fastapi_app.config import settings, ensure_secret_key
from fastapi_app.database import get_db, dispose_all_engines
from fastapi_app.services.notes_service import NotesService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure secret key on startup
    ensure_secret_key()
    
    # Import examples from json
    examples_path = Path(__file__).parent / "data" / "example_notes.json"
    if examples_path.exists():
        async for session in get_db():
            await NotesService.import_examples_from_file(session, str(examples_path))
            break
                
    cleanup_task = asyncio.create_task(cleanup_old_dbs())
    try:
        yield
    finally:
        cleanup_task.cancel()
        await dispose_all_engines()

app = FastAPI(title="Notes App", version="0.8.1", lifespan=lifespan)
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
async def index(request: Request):
    locale = getattr(request.state, "locale", "ru")
    _ = get_translator(locale)
    return templates.TemplateResponse(request=request, name="index.html", context={"_": _, "locale": locale})

@app.get("/editor")
async def editor_redirect():
    return RedirectResponse(url="/", status_code=307)

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
