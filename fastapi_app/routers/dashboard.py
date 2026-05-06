from fastapi import APIRouter, Request, Depends, Form, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from typing import Optional, List, Dict, Any, Union

from datetime import datetime, date, timedelta, timezone

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..services.state_manager import StateManager
from ..services.settings_service import get_setting, set_setting
from ..services.dashboard_service import DashboardService
from ..services.history_service import HistoryService
from ..dependencies import get_dashboard_service, get_history_service, get_sticky_note_service, get_state_manager
from .. import models
from ..utils import normalize_date
from ..config import templates
from ..logger import logger

router = APIRouter(
    tags=["dashboard"]
)

@router.get("/", response_class=HTMLResponse)
async def index(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    state_manager: StateManager = Depends(get_state_manager),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """
    Главная страница приложения (Dashboard).
    Отображает текущие задачи, события, привычки и слова для изучения.
    """
    db = dashboard_service.db
    # Генерируем контекст для слов и винк
    ctx = await state_manager.get_runtime_context()
    today_obj = datetime.now()
    today_actual = today_obj.date()            # актуальная дата (для шапки)
    today_for_calendar = today_actual - timedelta(days=1)  # вчера (для Chronology)

    dash_data = await dashboard_service.get_index_data()
    dashboard_map = await dashboard_service.get_dashboard_settings()

    one_thing, one_thing_date, one_thing_replacement = "...", 0, "..."

    if 'one_thing' in dashboard_map:
        item = dashboard_map['one_thing']
        one_thing = item.title
        d_obj = normalize_date(item.date)
        if d_obj:
            if isinstance(d_obj, datetime):
                d_obj = d_obj.date()
            one_thing_date = (today_obj.date() - d_obj).days
    if 'replacement' in dashboard_map:
        one_thing_replacement = dashboard_map['replacement'].title

    # Правила
    random_rule: Union[models.LanguageRule, Dict[str, str]] = {"language": "Info", "rule_ru": "Нет правил", "rule_en": "No rules available"}
    try:
        rule_res = await db.execute(select(models.LanguageRule).order_by(func.random()).limit(1))
        rule_obj = rule_res.scalar_one_or_none()
        if rule_obj: 
            random_rule = rule_obj
    except Exception as e:
        logger.warning(f"Failed to fetch random rule: {e}")

    categories_res = await db.execute(select(models.NoteCategory))
    categories = [c.name for c in categories_res.scalars().all()]
    layout_json = await get_setting(db, "dashboard_layout", "{}")

    # Получаем активные языки для динамической отрисовки заголовков виджета
    active_langs_raw = await get_setting(db, 'active_languages', 'en,it,de')
    active_langs = [l.strip() for l in (active_langs_raw or 'en,it,de').split(',') if l.strip()]
    
    lang_names_raw = await get_setting(db, 'language_names', '{}')
    import json
    try:
        lang_names = json.loads(lang_names_raw if lang_names_raw else '{}')
    except Exception:
        lang_names = {}

    return templates.TemplateResponse(request, "index.html", {
        "request": request,
        "words": ctx['words'],
        "active_languages": active_langs,
        "all_languages": lang_names,
        "wink": ctx['wink'],
        "count_words_translate": ctx['count'],
        "coverage_learning_words": ctx['coverage'],
        "iMW": ctx['imw'],
        "events_today": dash_data['events_today'],
        "events_tomorrow": dash_data['events_tomorrow'],
        "date_important": dash_data.get('date_important', []),
        "habits_all": dash_data['habits_all'],
        "tasks": dash_data['tasks'],
        "title_until": dash_data.get('title_until', '...'),
        "days_remaining": dash_data.get('days_remaining', 0),
        "title_after": dash_data.get('title_after', '...'),
        "days_passed": dash_data.get('days_passed', 0),
        "one_thing": one_thing,
        "one_thing_date": one_thing_date,
        "one_thing_replacement": one_thing_replacement,
        "random_rule": random_rule,
        "categories": categories,
        "dashboard_layout": layout_json,
        "today_for_calendar": today_for_calendar,
        "today_actual": today_actual,
        "now_utc": datetime.now(timezone.utc).replace(tzinfo=None),
        "stickers": dash_data.get('stickers', []),
        "observations": dash_data.get('observations', []),
        "pinned_notes": dash_data.get('pinned_notes', []),
        "habits_count": lambda start_date: (today_obj.date() - start_date).days if start_date else 0
    })

@router.get("/history", response_class=HTMLResponse)
async def history(
    request: Request,
    date_str: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """
    Страница истории/архива (History).
    Позволяет просматривать данные за прошлые даты или за "этот же день" в другие годы.
    """
    today_date = datetime.now().date()

    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            is_today_in_history = (target_date == today_date)
        except ValueError:
            target_date = today_date
            is_today_in_history = True
    else:
        target_date = today_date
        is_today_in_history = True

    history_service = await get_history_service(db)
    
    # Получаем данные через HistoryService
    events, chronology, notes, wink = await history_service.get_history_for_date(target_date, is_today_in_history)

    # Стикеры для истории
    sticker_service = await get_sticky_note_service(db)
    history_stickers = await sticker_service.get_notes_for_date(target_date)

    return templates.TemplateResponse(request, "history.html", {
        "request": request,
        "target_date": target_date,
        "events": events,
        "chronology": chronology,
        "notes": notes,
        "wink": wink,
        "stickers": history_stickers,
        "is_today_in_history": is_today_in_history,
        "is_fallback": False,
        "today_for_calendar": today_date,
    })

@router.post("/save_dashboard_layout")
async def save_dashboard_layout(
    request: Request, 
    context: str = "dashboard",
    db: AsyncSession = Depends(get_db), 
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, str]:
    """Сохранение кастомного порядка виджетов на дашборде."""
    data = await request.json()
    layout = data.get("layout", "{}")
    # Используем префикс context_layout для гибкости
    setting_key = "dashboard_layout" if context == "dashboard" else f"{context}_layout"
    await set_setting(db, setting_key, layout)
    return {"status": "success", "message": f"Layout for {context} saved"}

@router.get("/api/header/widgets", response_class=HTMLResponse)
async def get_header_widgets(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    state_manager: StateManager = Depends(get_state_manager),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """Возвращает свежий HTML для виджетов в шапке."""
    dash_data = await dashboard_service.get_index_data()
    ctx = await state_manager.get_runtime_context()
    return templates.TemplateResponse(request, "partials/header_info_widgets.html", {
        "date_important": dash_data.get('date_important', []),
        "title_until": dash_data.get('title_until', '...'),
        "days_remaining": dash_data.get('days_remaining', 0),
        "title_after": dash_data.get('title_after', '...'),
        "days_passed": dash_data.get('days_passed', 0),
        "wink": ctx.get('wink', '...')
    })
