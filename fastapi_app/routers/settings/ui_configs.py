from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import json
from typing import Any

from ...database import get_db
from ... import models, schemas
from ...services.settings_service import get_setting, set_setting, get_settings_context
from ...services.auth import check_auth_dependency
from ...config import templates

router = APIRouter(
    dependencies=[Depends(check_auth_dependency)]
)

@router.get("/settings", name="settings", response_class=HTMLResponse)
async def view_settings(
    request: Request, 
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Отображает страницу настроек."""
    ctx = await get_settings_context(db, request)
    return templates.TemplateResponse(request, "settings.html", ctx)

@router.post("/settings", name="update_settings")
async def update_settings(
    data: schemas.SettingsUpdateSchema = Depends(schemas.SettingsUpdateSchema.as_form),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Обновляет глобальные настройки приложения."""
    if data.max_duration is not None:
        await set_setting(db, 'max_duration', str(data.max_duration))
    if data.max_random_minutes is not None:
        await set_setting(db, 'max_random_minutes', str(data.max_random_minutes))

    await db.commit()
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/settings/update_languages", name="update_languages")
async def update_languages(
    data: schemas.LanguageUpdateSchema = Depends(schemas.LanguageUpdateSchema.as_form),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Обновляет список активных языков и их названия."""
    active_langs = [l.strip() for l in data.active_order.split(",") if l.strip()]
    if len(active_langs) > 3:
        active_langs = active_langs[:3]
    
    await set_setting(db, 'active_languages', ','.join(active_langs))
    
    lang_names_raw = await get_setting(db, 'language_names', '{}')
    lang_names = json.loads(lang_names_raw or '{}')
    
    extra_fields = data.model_extra or {}
    for key, value in extra_fields.items():
        if isinstance(key, str) and key.startswith("name_"):
            code = key.replace("name_", "")
            if value:
                lang_names[code] = str(value)
    
    await set_setting(db, 'language_names', json.dumps(lang_names))
    await db.commit()
    return RedirectResponse(url="/settings?saved=1", status_code=status.HTTP_303_SEE_OTHER)


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
    data: schemas.CategoryUpdateSchema = Depends(schemas.CategoryUpdateSchema.as_form),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Обновляет список категорий заметок."""
    new_categories = [c.strip() for c in data.categories_list.split('\n') if c.strip()]
    await db.execute(delete(models.NoteCategory))
    for cat in new_categories:
        db.add(models.NoteCategory(name=cat))
    await db.commit()
    return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/settings/update_event_color", response_model=schemas.SuccessResponse)
async def update_event_color(
    data: schemas.EventColorUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Обновляет подпись (легенду) для конкретного цвета событий."""
    event_colors_raw = await get_setting(db, "event_colors", "{}")
    try:
        colors = json.loads(event_colors_raw)
    except Exception:
        colors = {}
    
    if data.label.strip() == "":
        if data.color in colors:
            del colors[data.color]
    else:
        colors[data.color] = data.label.strip()
        
    await set_setting(db, "event_colors", json.dumps(colors))
    await db.commit()
    return schemas.SuccessResponse(message="Color label updated")
