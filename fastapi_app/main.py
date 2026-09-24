import asyncio
import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from fastapi_app.routers import notes, ai
from fastapi_app.config import ensure_secret_key, settings
from fastapi_app.services.security_store import demo_instance_lock
from fastapi_app.middleware import (
    SessionMiddleware,
    SecurityHeadersMiddleware,
    LocaleMiddleware,
    NoCacheStaticMiddleware,
    AccessBoundaryMiddleware,
    BodyLimitMiddleware,
    TrustedSchemeMiddleware,
)
from fastapi_app.tasks import cleanup_old_dbs
from fastapi_app.i18n import get_translator, locale_dict
from fastapi_app.services.manual_algorithm import get_manual_algorithm
from fastapi_app.rate_limiter import limiter
from fastapi_app.database import get_db, dispose_all_engines, initialize_databases, get_public_db
from fastapi_app.services.notes_service import NotesService
from fastapi_app.frontend_assets import asset

@asynccontextmanager
async def lifespan(app: FastAPI):
    with demo_instance_lock():
        # Ensure secret key on startup
        ensure_secret_key()

        await initialize_databases()

        # Import examples from json
        examples_path = Path(__file__).parent / "data" / "example_notes.json"
        if not settings.DEMO_MODE and examples_path.exists():
            async for session in get_db():
                await NotesService.import_examples_from_file(session, str(examples_path))

        cleanup_task = asyncio.create_task(cleanup_old_dbs())
        try:
            yield
        finally:
            cleanup_task.cancel()
            await asyncio.gather(cleanup_task, return_exceptions=True)
            await dispose_all_engines()
            from fastapi_app.services.llm_provider import llm_registry
            await llm_registry.aclose()

app = FastAPI(title="Notes App", version="0.8.3", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(SessionMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LocaleMiddleware)
app.add_middleware(NoCacheStaticMiddleware)
app.add_middleware(BodyLimitMiddleware)
app.add_middleware(AccessBoundaryMiddleware)
app.add_middleware(TrustedSchemeMiddleware)

# Mount static
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Templates
templates_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=templates_dir)
templates.env.globals['asset'] = asset

# Routers
app.include_router(notes.router, prefix="/api/dialectics", tags=["notes"])
app.include_router(ai.router, prefix="/api/ai/dialectics", tags=["ai"])

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    locale = getattr(request.state, "locale", "ru")
    _ = get_translator(locale)
    # Тексты алгоритма для ручного режима (подсказки блоков) — инлайним в
    # страницу как inert JSON #algorithm-data, источник prompts/7_*.json.
    algorithm_json = json.dumps(get_manual_algorithm(locale), ensure_ascii=False).replace("<", "\\u003c")
    i18n_json = json.dumps(locale_dict(locale), ensure_ascii=False).replace("<", "\\u003c")
    return templates.TemplateResponse(
        request=request, name="index.html",
        context={"_": _, "locale": locale, "algorithm_json": algorithm_json,
                 "i18n_json": i18n_json},
    )

@app.get("/editor")
async def editor_redirect():
    return RedirectResponse(url="/", status_code=307)

@app.get("/privacy", response_class=HTMLResponse)
@app.get("/terms", response_class=HTMLResponse)
async def legal_page(request: Request):
    """Политика конфиденциальности / Правила использования. Локаль страницы —
    из ?lang=, иначе cookie locale, иначе ru; для kz есть свой текст."""
    page = "privacy" if request.url.path.rstrip("/") == "/privacy" else "terms"
    req_lang = (request.query_params.get("lang") or "").lower()
    locale = req_lang if req_lang in ("ru", "en", "kz") else getattr(request.state, "locale", "ru")
    doc_locale = locale if locale in ("ru", "en", "kz") else "ru"
    _ = get_translator(locale)
    titles = {
        "privacy": {"ru": "Политика конфиденциальности", "en": "Privacy Policy", "kz": "Құпиялылық саясаты"},
        "terms": {"ru": "Правила использования", "en": "Terms of Use", "kz": "Пайдалану ережелері"},
    }
    return templates.TemplateResponse(
        request=request, name="legal.html",
        context={"_": _, "locale": locale, "doc_locale": doc_locale, "page": page,
                 "page_title": titles[page][doc_locale]},
    )

@app.get("/s/{token}", response_class=HTMLResponse)
async def shared_conspect(request: Request, token: str, db=Depends(get_public_db)):
    """Публичная страница расшаренного конспекта — только чтение, без редактора."""
    locale = getattr(request.state, "locale", "ru")
    _ = get_translator(locale)
    note = await NotesService.get_shared_note(db, token)
    blocks = note.content_json or []
    title = note.title
    # Публичная отдача — санитизируем HTML каждого блока (нет server-side
    # sanitize-on-write, а тут контент виден кому угодно по ссылке).
    from fastapi_app.services.sanitizer import sanitize_block_html
    blocks = [
        {**b, "html": sanitize_block_html(b.get("html", ""))}
        for b in blocks if isinstance(b, dict)
    ]
    algo = get_manual_algorithm(locale)
    return templates.TemplateResponse(
        request=request, name="shared.html",
        context={"_": _, "locale": locale, "blocks": blocks, "note_title": title,
                 "token": token, "algo": algo},
    )

@app.get("/health")
async def health():
    from fastapi_app.services.abuse_guard import stats
    return {"status": "ok", "generation": await stats()}

@app.get("/api/changelog")
async def get_changelog():
    from fastapi.responses import FileResponse
    changelog_path = Path(__file__).parent.parent / "CHANGELOG.md"
    if changelog_path.exists():
        return FileResponse(changelog_path)
    return JSONResponse(status_code=404, content={"error": "Changelog not found"})
