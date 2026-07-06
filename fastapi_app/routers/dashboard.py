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
from ..dependencies import get_dashboard_service, get_history_service, get_sticky_note_service, get_state_manager, get_word_service
from ..services.word_service import WordService
from .. import models
from ..utils import normalize_date
from ..config import templates
from ..logger import logger

router = APIRouter(
    tags=["dashboard"]
)

@router.get("/dashboard", response_class=HTMLResponse)
async def index(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    state_manager: StateManager = Depends(get_state_manager),
    word_service: WordService = Depends(get_word_service),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """
    Страница Dashboard.
    Отображает текущие задачи, события, привычки и слова для изучения.
    """
    page_context = await dashboard_service.get_dashboard_page_context(
        word_service=word_service, state_manager=state_manager
    )
    page_context["request"] = request
    return templates.TemplateResponse(request, "dashboard.html", page_context)

# reload trigger


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

@router.get("/api/dashboard/widget/events", response_class=HTMLResponse)
async def get_dashboard_events_widget(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """Возвращает обновленный HTML для виджета событий."""
    today_dt = datetime.now()
    today_obj = today_dt.date()
    tomorrow_obj = today_obj + timedelta(days=1)
    
    start_of_today = datetime.combine(today_obj, datetime.min.time())
    end_of_today = datetime.combine(today_obj, datetime.max.time())
    events_today = await dashboard_service.events.get_events_for_range(start_of_today, end_of_today)

    start_of_tomorrow = datetime.combine(tomorrow_obj, datetime.min.time())
    end_of_tomorrow = datetime.combine(tomorrow_obj, datetime.max.time())
    events_tomorrow = await dashboard_service.events.get_events_for_range(start_of_tomorrow, end_of_tomorrow)

    return templates.TemplateResponse(request, "partials/schedule_widget.html", {
        "request": request,
        "events_today": events_today,
        "events_tomorrow": events_tomorrow,
        "now_utc": datetime.now(timezone.utc).replace(tzinfo=None)
    })

@router.get("/api/dashboard/widget/observations", response_class=HTMLResponse)
async def get_dashboard_observations_widget(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """Возвращает обновленный HTML для виджета активностей."""
    today_obj = datetime.now().date()
    observations = await dashboard_service.observations_service.get_dashboard_observations(today_obj)
    sets = await dashboard_service.observations_service.get_all_sets()
    active_set = await dashboard_service.observations_service.ensure_active_set()
    return templates.TemplateResponse(request, "widgets/observation_wrapper.html", {
        "request": request,
        "observations": observations,
        "observation_sets": sets,
        "active_observation_set": active_set
    })

@router.get("/api/dashboard/widget/stickers", response_class=HTMLResponse)
async def get_dashboard_stickers_widget(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """Возвращает обновленный HTML для виджета стикеров."""
    stickers = await dashboard_service.sticky_notes.get_active_notes()
    return templates.TemplateResponse(request, "widgets/stickers_widget.html", {
        "request": request,
        "stickers": stickers
    })

@router.get("/api/dashboard/widget/tasks", response_class=HTMLResponse)
async def get_dashboard_tasks_widget(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency)
):
    dash_data = await dashboard_service.get_index_data()
    dashboard_map = await dashboard_service.get_dashboard_settings()
    
    today_obj = datetime.now()
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

    return templates.TemplateResponse(request, "partials/tasks_widget.html", {
        "request": request,
        "tasks": dash_data['tasks'],
        "task_sets": dash_data.get('task_sets', []),
        "active_task_set": dash_data.get('active_task_set', None),
        "now_utc": datetime.now(timezone.utc).replace(tzinfo=None),
        "one_thing": one_thing,
        "one_thing_date": one_thing_date,
        "one_thing_replacement": one_thing_replacement
    })

@router.get("/api/dashboard/widget/habits", response_class=HTMLResponse)
async def get_dashboard_habits_widget(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency)
):
    dash_data = await dashboard_service.get_index_data()
    today_obj = datetime.now()
    
    return templates.TemplateResponse(request, "partials/habits_widget.html", {
        "request": request,
        "habits_all": dash_data['habits_all'],
        "habits_count": lambda start_date: (today_obj.date() - start_date).days if start_date else 0
    })

@router.get("/api/changelog", response_class=HTMLResponse)
async def get_changelog(user: Any = Depends(check_auth_dependency)):
    import markdown
    from pathlib import Path
    changelog_path = Path("CHANGELOG.md")
    if changelog_path.exists():
        text = changelog_path.read_text(encoding="utf-8")
        html = markdown.markdown(text, extensions=['fenced_code', 'tables'])
        return HTMLResponse(content=html)
    return HTMLResponse(content="<p>Changelog not found.</p>")
