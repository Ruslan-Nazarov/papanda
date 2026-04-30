from fastapi import APIRouter, Depends, Request, Form, HTTPException, status, UploadFile, File
from fastapi.responses import RedirectResponse, StreamingResponse, JSONResponse, FileResponse, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, delete, text, or_, and_
import os
import io
import json
import shutil
import calendar
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any, Union, Tuple
from pydantic import ValidationError

from ..database import get_db
from .. import models
from ..services.state_manager import StateManager
from ..services.word_service import WordService
from ..services.settings_service import get_setting, set_setting, initialize_language_settings, get_settings_context
from ..utils import parse_date_input
from ..config import settings, BASE_DIR, templates
from ..services.auth import (
    check_auth_dependency, get_current_user_from_cookie,
    COOKIE_NAME, create_access_token
)
from ..dependencies import (
    get_word_service, get_state_manager, 
    get_maintenance_service, get_admin_service, get_export_service, get_account_service,
    get_dashboard_service
)
from ..services.admin_service import AdminService
from ..services.export_service import ExportService
from ..services.account_service import AccountService
from ..services.dashboard_service import DashboardService
from ..services.maintenance_service import MaintenanceService
from .. import schemas
from ..logger import logger

router = APIRouter(
    tags=["settings"],
    dependencies=[Depends(check_auth_dependency)]
)

# Вспомогательные функции удалены — логика перенесена в AdminService


@router.get("/settings", name="settings", response_class=HTMLResponse)
async def view_settings(
    request: Request, 
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Отображает страницу настроек."""
    ctx = await get_settings_context(db, request)
    return templates.TemplateResponse(request, "settings.html", ctx)

@router.post("/settings/update_account", name="update_account")
async def update_account(
    request: Request,
    account_service: AccountService = Depends(get_account_service),
) -> RedirectResponse:
    """Обновляет имя пользователя или пароль через AccountService."""
    try:
        form_data = await request.form()
        data = schemas.AccountUpdateSchema(**dict(form_data))
    except ValidationError:
        return RedirectResponse(url="/settings?error=validation", status_code=status.HTTP_303_SEE_OTHER)

    current_username = get_current_user_from_cookie(request)
    if not current_username:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

    # Note: Only update if fields are provided
    user, new_token_sub = await account_service.update_user(current_username, data.username, data.password)
    
    response = RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
    if new_token_sub:
        new_token = create_access_token(data={"sub": new_token_sub})
        response.set_cookie(key=COOKIE_NAME, value=new_token, httponly=True, max_age=2592000, samesite="lax")

    return response

@router.post("/settings", name="update_settings")
async def update_settings(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Обновляет глобальные настройки приложения."""
    try:
        form_data = await request.form()
        data = schemas.SettingsUpdateSchema(**dict(form_data))
    except ValidationError:
        return RedirectResponse(url="/settings?error=validation", status_code=status.HTTP_303_SEE_OTHER)

    if data.max_duration is not None:
        await set_setting(db, 'max_duration', str(data.max_duration))
    if data.max_random_minutes is not None:
        await set_setting(db, 'max_random_minutes', str(data.max_random_minutes))

    await db.commit()
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/settings/update_languages", name="update_languages")
async def update_languages(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Обновляет список активных языков и их названия."""
    try:
        form_data = await request.form()
        data = schemas.LanguageUpdateSchema(**dict(form_data))
    except ValidationError:
        return RedirectResponse(url="/settings?error=validation", status_code=status.HTTP_303_SEE_OTHER)
    
    # 1. Получаем порядок и выбранные языки
    active_langs = [l.strip() for l in data.active_order.split(",") if l.strip()]
    
    # Ограничиваем тремя
    if len(active_langs) > 3:
        active_langs = active_langs[:3]
    
    await set_setting(db, 'active_languages', ','.join(active_langs))
    
    # 2. Обновляем названия языков из долей name_{code} (через extra fields)
    lang_names_raw = await get_setting(db, 'language_names', '{}')
    lang_names = json.loads(lang_names_raw or '{}')
    
    # Pydantic schema with extra='allow' stores extra fields in __dict__ or model_extra
    extra_fields = data.model_extra or {}
    for key, value in extra_fields.items():
        if isinstance(key, str) and key.startswith("name_"):
            code = key.replace("name_", "")
            if value:
                lang_names[code] = str(value)
    
    await set_setting(db, 'language_names', json.dumps(lang_names))
    
    await db.commit()
    return RedirectResponse(url="/settings?saved=1", status_code=status.HTTP_303_SEE_OTHER)
@router.post("/delete_event_settings/{event_id}", name="delete_event_settings")
async def delete_event_settings(
    request: Request,
    event_id: int,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Удаляет событие из режима просмотра БД в настройках."""
    event_res = await db.execute(select(models.Event).where(models.Event.id == event_id))
    e = event_res.scalar_one_or_none()
    if e:
        await db.delete(e)
        await db.commit()
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
@router.get("/db_view/{model_name}", name="db_view", response_class=HTMLResponse)
async def db_view(
    request: Request,
    model_name: str,
    month: Optional[str] = None,
    day: Optional[str] = None,
    year: Optional[str] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    db: AsyncSession = Depends(get_db),
    as_service: AdminService = Depends(get_admin_service),
    dashboard_service: DashboardService = Depends(get_dashboard_service)
) -> Any:
    """
    Универсальный просмотрщик таблиц базы данных с фильтрацией.
    Вся логика делегирована AdminService.
    """
    i_month = int(month) if month and month.strip() else None
    i_day = int(day) if day and day.strip() else None
    i_year = int(year) if year and year.strip() else None
    s_search = search.strip() if search and search.strip() else None

    # Для событий предварительно расширяем повторяющиеся серии
    if model_name == 'Event':
        now = datetime.now()
        eff_month = i_month or now.month
        eff_year = i_year or now.year
        last_day = calendar.monthrange(eff_year, eff_month)[1]
        target_horizon = date(eff_year, eff_month, last_day) + timedelta(days=10)
        await dashboard_service.expand_recurrence_events(horizon_date=target_horizon)

    try:
        ctx = await as_service.get_db_view_context(
            model_name=model_name,
            month=i_month,
            day=i_day,
            year=i_year,
            search=s_search,
            category=category,
            sort=sort,
            page=page
        )
    except ValueError:
        return RedirectResponse(url="/")

    ctx["request"] = request
    return templates.TemplateResponse(request, "db_view.html", ctx)

@router.get("/edit_record/{model_name}/{record_id}", name="edit_record", response_class=HTMLResponse)
async def edit_record_get(
    request: Request, 
    model_name: str, 
    record_id: str, 
    db: AsyncSession = Depends(get_db),
    as_service: AdminService = Depends(get_admin_service)
) -> Any:
    """Отображает страницу редактирования записи БД."""
    Model = as_service.get_model(model_name)
    if not Model: return RedirectResponse(url="/")

    pk_name = 'id'
    if model_name == 'WordStats': pk_name = 'word'

    pk_val: Union[str, int] = record_id
    if pk_name == 'id':
        try: pk_val = int(record_id)
        except ValueError: pass

    record_res = await db.execute(select(Model).where(getattr(Model, pk_name) == pk_val))
    record = record_res.scalar_one_or_none()
    if not record: return RedirectResponse(url=f"/db_view/{model_name}")

    columns = [c.name for c in Model.__table__.columns]
    return templates.TemplateResponse(request, "db_edit.html", {
        "request": request,
        "record": record,
        "columns": columns,
        "model_name": model_name,
    })
@router.post("/edit_record/{model_name}/{record_id}")
async def edit_record_post(
    request: Request,
    model_name: str,
    record_id: str,
    db: AsyncSession = Depends(get_db),
    as_service: AdminService = Depends(get_admin_service)
) -> RedirectResponse:
    """Сохраняет изменения в записи БД."""
    Model = as_service.get_model(model_name)
    if not Model: return RedirectResponse(url="/")

    pk_name = 'id'
    if model_name == 'WordStats': pk_name = 'word'

    pk_val: Union[str, int] = record_id
    if pk_name == 'id':
        try: pk_val = int(record_id)
        except ValueError: pass

    record_res = await db.execute(select(Model).where(getattr(Model, pk_name) == pk_val))
    record = record_res.scalar_one_or_none()
    if not record: return RedirectResponse(url=f"/db_view/{model_name}")

    form_data = await request.form()
    # Конвертируем FormData в словарь для сервиса
    data = {k: v for k, v in form_data.items() if k not in ['id', 'created_at', 'word']}
    
    await as_service.update_item(model_name, record_id, data)
    return RedirectResponse(url=f"/db_view/{model_name}", status_code=status.HTTP_303_SEE_OTHER)
@router.get("/settings/export/{model_name}", name="export_csv")
async def export_csv(
    model_name: str, 
    as_service: AdminService = Depends(get_admin_service),
    export_service: ExportService = Depends(get_export_service)
) -> Any:
    """Экспортирует таблицу БД в формат CSV."""
    Model = as_service.get_model(model_name)
    if not Model: return RedirectResponse(url="/settings")

    content = await export_service.export_to_csv(Model)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=papanda_{model_name.lower()}.csv"}
    )
@router.get("/settings/export_excel/{model_name}", name="export_excel")
async def export_excel(
    model_name: str, 
    as_service: AdminService = Depends(get_admin_service),
    export_service: ExportService = Depends(get_export_service)
) -> Any:
    """Экспортирует таблицу БД в формат Excel."""
    Model = as_service.get_model(model_name)
    if not Model: return RedirectResponse(url="/settings")

    content = await export_service.export_model_to_excel(Model)
    filename = f"papanda_{model_name.lower()}.xlsx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
@router.post("/delete_record/{model_name}/{record_id}", name="delete_record")
async def delete_record(
    request: Request,
    model_name: str,
    record_id: str,
    db: AsyncSession = Depends(get_db),
    as_service: AdminService = Depends(get_admin_service),
) -> Any:
    """Удаляет запись из БД (универсальный хендлер)."""
    # If it's an Event, we might need to handle recurrence logic
    if model_name == 'Event':
        return RedirectResponse(url=f"/delete_event/{record_id}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    Model = as_service.get_model(model_name)
    if Model:
        pk_name = 'id'
        if model_name == 'WordStats':
            pk_name = 'word'

        pk_val: Union[str, int] = record_id
        if pk_name == 'id':
            try:
                pk_val = int(record_id)
            except ValueError:
                pass

        attr = getattr(Model, pk_name)
        stmt = delete(Model).where(attr == pk_val)
        await db.execute(stmt)
        await db.commit()
        
    accept_header = request.headers.get("accept", "").lower()
    if "application/json" in accept_header or request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return JSONResponse(content={"status": "success", "message": f"{model_name} deleted"})
        
    return RedirectResponse(url=f"/db_view/{model_name}", status_code=status.HTTP_303_SEE_OTHER)
@router.get("/settings/download_db/{filename}", name="download_db")
async def download_db(filename: str) -> FileResponse:
    """Позволяет скачать файл базы данных из папки db."""
    file_path = settings.db_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/x-sqlite3"
    )
@router.post("/settings/upload_db", name="upload_db")
async def upload_db(db_file: UploadFile = File(...)) -> RedirectResponse:
    """Загружает файл базы данных в папку db."""
    if not (db_file.filename and db_file.filename.endswith('.db')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .db allowed.")
    
    file_path = settings.db_dir / db_file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(db_file.file, buffer)
    
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
@router.post("/settings/delete_db/{filename}", name="delete_db_file")
async def delete_db_file(
    filename: str,
    ms: MaintenanceService = Depends(get_maintenance_service)
) -> RedirectResponse:
    """Удаляет файл базы данных."""
    try:
        await ms.delete_backup(filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        pass # Already gone
    
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
@router.post("/settings/activate_db/{filename}", name="activate_db")
async def activate_db(
    filename: str,
    ms: MaintenanceService = Depends(get_maintenance_service)
) -> RedirectResponse:
    """
    Активирует выбранную базу данных путём миграции данных из неё в текущую базу.
    Таблица users при этом сохраняется (не затирается).
    """
    try:
        await ms.sync_data_from_file(filename)
        logger.info(f"[SETTINGS] Data migration successful from {filename}.")
    except Exception as e:
        logger.error(f"[SETTINGS] Data migration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Data migration failed: {e}")
    
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
@router.post("/settings/start_sandbox", name="start_sandbox")
async def start_sandbox() -> RedirectResponse:
    """Активирует режим песочницы через куку."""
    response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        key="papanda_mode",
        value="sandbox",
        httponly=True,
        max_age=3600 # 1 час теста
    )
    return response

@router.post("/settings/exit_sandbox", name="exit_sandbox")
async def exit_sandbox() -> RedirectResponse:
    """Выключает режим песочницы."""
    response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie("papanda_mode")
    return response

@router.get("/settings/categories", name="show_categories", response_class=HTMLResponse)
async def show_categories(request: Request, db: AsyncSession = Depends(get_db)) -> Any:
    """Отображает страницу редактирования категорий заметок."""
    cats_res = await db.execute(select(models.NoteCategory))
    categories = [c.name for c in cats_res.scalars().all()]
    return templates.TemplateResponse(request, "edit_categories.html", {
        "request": request,
        "categories": categories,
    })
@router.post("/settings/categories/edit", name="edit_categories")
async def edit_categories(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Обновляет список категорий заметок."""
    try:
        form_data = await request.form()
        data = schemas.CategoryUpdateSchema(**dict(form_data))
    except ValidationError:
        return RedirectResponse(url="/settings/categories?error=validation", status_code=status.HTTP_303_SEE_OTHER)

    new_categories = [c.strip() for c in data.categories_list.split('\n') if c.strip()]
    await db.execute(delete(models.NoteCategory))
    for cat in new_categories:
        db.add(models.NoteCategory(name=cat))
    await db.commit()
    return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
@router.post("/settings/import_excel", name="import_excel", response_class=HTMLResponse)
async def import_excel(
    request: Request,
    db: AsyncSession = Depends(get_db),
    state_manager: StateManager = Depends(get_state_manager),
) -> Any:
    """Выполняет импорт данных из Excel файла."""
    result = await state_manager.import_excel_to_db(str(settings.excel_path))
    logger.info(f"[IMPORT] {result['message']}")
    ctx = await get_settings_context(db, request, import_result=result)
    return templates.TemplateResponse(request, "settings.html", ctx)

@router.post("/settings/sync_conflicts", name="sync_conflicts", response_class=HTMLResponse)
async def sync_conflicts_route(
    request: Request,
    db: AsyncSession = Depends(get_db),
    state_manager: StateManager = Depends(get_state_manager),
) -> Any:
    """Разрешает конфликты синхронизации между БД и Excel."""
    form_data = await request.form()
    resolutions = {}
    for key, value in form_data.items():
        if isinstance(key, str) and key.startswith("action_") and value in ("to_db", "to_file"):
            word = key[len("action_"):]
            resolutions[word] = str(value)

    result = await state_manager.sync_conflicts(str(settings.excel_path), resolutions)
    logger.info(f"[SYNC CONFLICTS] {result.get('message', '')}")
    ctx = await get_settings_context(db, request, import_result=result)
    return templates.TemplateResponse(request, "settings.html", ctx)
@router.post("/edit_event_inline", name="edit_event_inline")
async def edit_event_inline(
    request: Request, 
    dashboard_service: DashboardService = Depends(get_dashboard_service)
) -> JSONResponse:
    """Редактирует событие или СОЗДАЕТ новое через DashboardService."""
    data = await request.json()
    success, message, created_id = await dashboard_service.update_event_inline(data)
    
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": message, "id": created_id})
    else:
        return JSONResponse(status_code=400, content={"status": "error", "message": message})

@router.post("/edit_note_inline", name="edit_note_inline")
async def edit_note_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    """Редактирует заметку через AdminService."""
    data = await request.json()
    success = await as_service.update_item("Notes", data.get("id"), data)
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": "Note updated"})
    return JSONResponse(status_code=400, content={"status": "error", "message": "Update failed"})

@router.post("/edit_chrono_inline", name="edit_chrono_inline")
async def edit_chrono_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    """Редактирует запись хронологии через AdminService."""
    data = await request.json()
    success = await as_service.update_item("Chronology", data.get("id"), data)
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": "Chronology updated"})
    return JSONResponse(status_code=400, content={"status": "error", "message": "Update failed"})

@router.post("/edit_habit_inline", name="edit_habit_inline")
async def edit_habit_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    """Редактирует привычку через AdminService."""
    data = await request.json()
    success = await as_service.update_item("Habit", data.get("id"), data)
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": "Habit updated"})
    return JSONResponse(status_code=400, content={"status": "error", "message": "Update failed"})

@router.post("/edit_task_inline", name="edit_task_inline")
async def edit_task_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    """Редактирует задачу через AdminService."""
    data = await request.json()
    success = await as_service.update_item("Task", data.get("id"), data)
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": "Task updated"})
    return JSONResponse(status_code=400, content={"status": "error", "message": "Update failed"})

@router.post("/edit_wink_inline", name="edit_wink_inline")
async def edit_wink_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    """Редактирует Wink через AdminService."""
    data = await request.json()
    success = await as_service.update_item("Wink", data.get("id"), data)
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": "Wink updated"})
    return JSONResponse(status_code=400, content={"status": "error", "message": "Update failed"})

@router.post("/edit_sticker_inline", name="edit_sticker_inline")
async def edit_sticker_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    """Редактирует стикер через AdminService."""
    data = await request.json()
    success = await as_service.update_item("Stickers", data.get("id"), data)
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": "Sticker updated"})
    return JSONResponse(status_code=400, content={"status": "error", "message": "Update failed"})

@router.post("/settings/deep_clean", name="deep_clean")
async def deep_clean(
    request: Request,
    db: AsyncSession = Depends(get_db),
    ms: MaintenanceService = Depends(get_maintenance_service)
) -> RedirectResponse:
    """
    Sharing Preparation (Deep Clean)
    Очищает базу данных (все модели), удаляет дополнительные .db файлы и словари.
    """
    try:
        await ms.deep_clean()
    except Exception as e:
        logger.error(f"[DEEP CLEAN] Failed: {e}")
    
    logger.warning("[SETTINGS] DEEP CLEAN performed. System reset to factory state.")
    
    response = RedirectResponse(url="/register", status_code=status.HTTP_302_FOUND)
    response.delete_cookie(COOKIE_NAME)
    return response

def kill_self() -> None:
    """Принудительно завершает процесс через секунду."""
    import time
    import signal
    time.sleep(1)
    os.kill(os.getpid(), signal.SIGTERM)

@router.post("/settings/shutdown_app", name="shutdown_app")
async def shutdown_app() -> JSONResponse:
    """Завершает работу сервера."""
    logger.warning("[SYSTEM] Shutdown requested via UI.")
    
    import threading
    threading.Thread(target=kill_self, daemon=True).start()
    return JSONResponse(content={"status": "success", "message": "Приложение завершает работу. Можете закрыть вкладку."})

@router.post("/settings/update_event_color", name="update_event_color")
async def update_event_color(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> JSONResponse:
    """Обновляет подпись (легенду) для конкретного цвета событий."""
    try:
        data = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"status": "error", "message": "Invalid JSON"})
        
    color = data.get("color")
    label = data.get("label", "")
    if not color:
        return JSONResponse(status_code=400, content={"status": "error", "message": "No color provided"})

    from ..services.settings_service import get_setting, set_setting
    import json
    
    event_colors_raw = await get_setting(db, "event_colors", "{}")
    try:
        colors = json.loads(event_colors_raw)
    except Exception:
        colors = {}
    
    if label.strip() == "":
        if color in colors:
            del colors[color]
    else:
        colors[color] = label.strip()
        
    await set_setting(db, "event_colors", json.dumps(colors))
    await db.commit()
    return JSONResponse(content={"status": "success", "message": "Color label updated"})

@router.get("/api/events/tree/{color}", name="get_event_tree")
async def get_event_tree(color: str, db: AsyncSession = Depends(get_db)) -> JSONResponse:
    """Возвращает все события заданного цвета для визуализации 'дерева'."""
    if not color.startswith("#") and len(color) in (6, 3, 8):
        color = "#" + color

    result = await db.execute(
        select(models.Event)
        .where(models.Event.color == color)
        .order_by(models.Event.date.asc())
    )
    events = list(result.scalars().all())
    
    tree_data: List[Dict[str, Any]] = []
    for e in events:
        stickers_res = await db.execute(
            select(func.count(models.StickyNote.id))
            .where(
                models.StickyNote.finished_at.is_(None),
                or_(
                    models.StickyNote.event_id == e.id,
                    and_(
                        models.StickyNote.recurrence_id.isnot(None),
                        models.StickyNote.recurrence_id == e.recurrence_id
                    )
                )
            )
        )
        has_stickers = (stickers_res.scalar() or 0) > 0
        
        tree_data.append({
            "id": e.id,
            "title": e.title,
            "date": e.date.isoformat(),
            "has_stickers": has_stickers,
            "recurrence_id": e.recurrence_id
        })
        
    return JSONResponse(content={"status": "success", "data": tree_data})
