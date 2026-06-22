"""
Главный файл FastAPI-приложения Papanda.
Здесь ТОЛЬКО инициализация. Вся логика — в папке routers/.
"""

from fastapi import FastAPI, Request, status, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from contextlib import asynccontextmanager
from typing import Any, Callable

from .exceptions import PapandaError
from . import models
from .database import get_engine
from .routers import settings as settings_router, auth as auth_router
from .routers import dashboard, words, notes, actions, dnd, stickers, observation, dialectics, ai
from .config import settings, BASE_DIR, templates, INTERNAL_ROOT
from .services.auth import get_current_user_from_cookie
from .logger import logger

import secrets

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Управляет жизненным циклом приложения.
    """
    if not settings.demo_mode:
        try:
            # Создаем таблицы (в основной базе при старте)
            main_engine = get_engine("default")
            async with main_engine.begin() as conn:
                await conn.run_sync(models.Base.metadata.create_all)
            logger.info("Database initialization successful. All tables verified.")
        
            # Гарантируем наличие примера конспекта в основной базе
            from .database import get_session_maker, seed_example_note
            session_maker = get_session_maker("default")
            async with session_maker() as db:
                await seed_example_note(db)
                
                # Auto-import if dictionary is empty
                from .services.word_service import WordService
                from .services.state_manager import StateManager
                from .config import settings as app_settings
                
                word_service = WordService(db)
                metrics = await word_service.get_current_metrics()
                if metrics.get('total_count', 0) == 0:
                    logger.info("Database dictionary is empty. Running auto-import from translate.xlsx...")
                    state_manager = StateManager(db)
                    result = await state_manager.import_excel_to_db(str(app_settings.excel_path))
                    logger.info(f"Auto-import result: {result.get('message')}")
                
        except Exception as e:
            logger.error(f"Database initialization FAILED: {e}", exc_info=True)
        
    yield
    pass

import mimetypes
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

# Настройка приложения
app = FastAPI(
    title="Papanda API",
    description="Образовательное приложение",
    version="0.6.5",
    lifespan=lifespan
)
app.state.settings = settings

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers_and_user(request: Request, call_next: Callable) -> Any:
    """
    Middleware для добавления заголовков безопасности, пользователя в request.state и логирования.
    """
    # Инициализация сессии для демо-песочницы
    if settings.demo_mode:
        session_id = request.cookies.get("papanda_session_id")
        new_session = False
        if not session_id:
            session_id = secrets.token_hex(16)
            new_session = True
        request.state.session_id = session_id
    else:
        request.state.session_id = "default"

    user = get_current_user_from_cookie(request)
    request.state.user = user

    response = await call_next(request)

    # Логируем запрос (структурировано)
    logger.info(f"{request.method} {request.url.path} - {response.status_code}")

    # Check locale
    locale = request.cookies.get("locale")
    locale_set_by_header = False
    if not locale:
        accept_language = request.headers.get("Accept-Language", "en").lower()
        if accept_language.startswith("ru") or " ru" in accept_language or ";ru" in accept_language:
            locale = "ru"
        elif accept_language.startswith("kk") or " kk" in accept_language or ";kk" in accept_language:
            locale = "kk"
        else:
            locale = "en"
            
        # Inject into request scope for downstream handlers
        headers = dict(request.scope['headers'])
        cookie_header = headers.get(b'cookie', b'').decode('latin-1')
        new_cookie = f"locale={locale}"
        if cookie_header:
            cookie_header += f"; {new_cookie}"
        else:
            cookie_header = new_cookie
        headers[b'cookie'] = cookie_header.encode('latin-1')
        request.scope['headers'] = [(k, v) for k, v in headers.items()]
        locale_set_by_header = True

    # Устанавливаем куку сессии для демо-режима
    if settings.demo_mode and new_session:
        response.set_cookie(
            "papanda_session_id",
            session_id,
            httponly=True,
            samesite="lax",
            max_age=3600 * 24  # 24 часа
        )
        
    if locale_set_by_header:
        response.set_cookie(key="locale", value=locale, max_age=31536000)

    # Добавляем заголовки безопасности
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com https://d3js.org https://npmcdn.com https://*.npmcdn.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com https://cdn.quilljs.com https://fonts.googleapis.com; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com https://d3js.org https://cdn.quilljs.com https://npmcdn.com https://*.npmcdn.com https://mc.yandex.ru; "
        "font-src 'self' https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com https://fonts.gstatic.com data:; "
        "img-src 'self' data: blob: https://mc.yandex.ru; "
        "connect-src 'self' ws: wss: https://d3js.org https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com https://mc.yandex.ru;"
    )

    return response

@app.exception_handler(PapandaError)
async def papanda_exception_handler(request: Request, exc: PapandaError) -> Any:
    """Обработка кастомных ошибок приложения."""
    logger.warning(f"App Error: {exc.message} (status: {exc.status_code})")
    
    if "text/html" in request.headers.get("accept", ""):
        return templates.TemplateResponse(request, "error.html", {
            "detail": exc.message,
            "details": exc.details
        }, status_code=exc.status_code)
        
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.message,
            "details": exc.details
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> Any:
    """Обработка всех необработанных исключений."""
    logger.error(f"Global Exception: {str(exc)}", exc_info=True)
    if "text/html" in request.headers.get("accept", ""):
        return templates.TemplateResponse(request, "error.html", {
            "detail": "An internal server error occurred. Please try again later."
        }, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal Server Error"}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> Any:
    """Обработка ошибок валидации запросов."""
    logger.warning(f"Validation Error: {exc.errors()}")
    if "text/html" in request.headers.get("accept", ""):
        return templates.TemplateResponse(request, "error.html", {
            "detail": "Data validation error. Please check the values entered."
        }, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> Any:
    """Обработка ошибок SQLAlchemy."""
    logger.error(f"Database Error: {str(exc)}", exc_info=True)
    if "text/html" in request.headers.get("accept", ""):
        return templates.TemplateResponse(request, "error.html", {
            "detail": "Database error. We are already working on a fix."
        }, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Database error"}
    )

@app.websocket("/ws/ping")
async def websocket_ping(websocket: WebSocket):
    """WebSocket для поддержания активности сессии (auto-shutdown)."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"pong: {data}")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> FileResponse:
    """Возвращает иконку сайта."""
    return FileResponse(str(BASE_DIR / "fastapi_app" / "static" / "logo.ico"))

# Подключаем папку со статикой (CSS, иконки)
app.mount(
    "/static",
    StaticFiles(directory=str(INTERNAL_ROOT / "fastapi_app" / "static")),
    name="static"
)

# --- Подключаем все роутеры ---
app.include_router(auth_router.router)       # /login, /register, /logout
app.include_router(settings_router.router)   # /settings

# Модульные роутеры (Service Layer)
app.include_router(dashboard.router)         # /, /history, /save_dashboard_layout
app.include_router(words.router)             # /word_stats, /get_new_words, /get_random_rule и др.
app.include_router(notes.router)             # /add_note
app.include_router(actions.router)           # /submit_form, /submit_chrono, /mark_done и др.
app.include_router(dnd.router)               # /api/dnd/...
app.include_router(stickers.router)          # /api/stickers/...
app.include_router(observation.router)       # /api/observations/...
app.include_router(dialectics.router)       # /dialectics
app.include_router(ai.router)               # /api/ai/...


