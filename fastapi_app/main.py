"""
Главный файл FastAPI-приложения Papanda.
Здесь ТОЛЬКО инициализация. Вся логика — в папке routers/.
"""

from fastapi import FastAPI, Request, status
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
from .routers import settings as settings_router, auth as auth_router, admin
from .routers import dashboard, words, notes, actions, dnd, stickers, observation, smart_notes
from .config import settings, BASE_DIR, templates, INTERNAL_ROOT
from .services.auth import get_current_user_from_cookie
from .logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Управляет жизненным циклом приложения: инициализация БД при старте и очистка ресурсов при выключении.
    """
    try:
        # Создаем таблицы (в основной базе при старте)
        main_engine = get_engine("default")
        async with main_engine.begin() as conn:
            await conn.run_sync(models.Base.metadata.create_all)
        logger.info("Database initialization successful. All tables verified.")
    except Exception as e:
        logger.error(f"Database initialization FAILED: {e}", exc_info=True)
        
    yield
    # Очистка ресурсов при выключении (опционально)
    # await get_engine("default").dispose()
    pass

# Настройка приложения
app = FastAPI(
    title="Papanda API",
    description="Образовательное приложение",
    version="0.6.1",
    lifespan=lifespan
)

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
    user = get_current_user_from_cookie(request)
    request.state.user = user

    response = await call_next(request)

    # Логируем запрос (структурировано)
    logger.info(f"{request.method} {request.url.path} - {response.status_code}")

    # Добавляем заголовки безопасности
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com https://d3js.org; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com https://cdn.quilljs.com; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com https://d3js.org https://cdn.quilljs.com; "
        "font-src 'self' https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com data:; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' https://d3js.org https://cdn.jsdelivr.net https://*.jsdelivr.net https://unpkg.com https://*.unpkg.com;"
    )

    return response

@app.exception_handler(PapandaError)
async def papanda_exception_handler(request: Request, exc: PapandaError) -> Any:
    """Обработка кастомных ошибок приложения."""
    logger.warning(f"App Error: {exc.message} (status: {exc.status_code})")
    
    if "text/html" in request.headers.get("accept", ""):
        return templates.TemplateResponse("error.html", {
            "request": request,
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
        return templates.TemplateResponse("error.html", {
            "request": request,
            "detail": "Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте позже."
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
        return templates.TemplateResponse("error.html", {
            "request": request,
            "detail": "Ошибка валидации данных. Пожалуйста, проверьте введенные значения."
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
        return templates.TemplateResponse("error.html", {
            "request": request,
            "detail": "Ошибка базы данных. Мы уже работаем над исправлением."
        }, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Database error"}
    )

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
app.include_router(admin.router)             # /db_view

# Модульные роутеры (Service Layer)
app.include_router(dashboard.router)         # /, /history, /save_dashboard_layout
app.include_router(words.router)             # /word_stats, /get_new_words, /get_random_rule и др.
app.include_router(notes.router)             # /add_note
app.include_router(actions.router)           # /submit_form, /submit_chrono, /mark_done и др.
app.include_router(dnd.router)               # /api/dnd/...
app.include_router(stickers.router)          # /api/stickers/...
app.include_router(observation.router)       # /api/observations/...
app.include_router(smart_notes.router)       # /smart_notes
