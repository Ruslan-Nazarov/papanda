from fastapi import APIRouter, Request, Depends, Form, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from datetime import datetime, date, timedelta, timezone

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..services.state_manager import get_runtime_context
from ..services.settings_service import get_setting, set_setting
from ..services.dashboard_service import DashboardService
from ..services.history_service import HistoryService
from ..dependencies import get_dashboard_service, get_history_service, get_sticky_note_service
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
    user=Depends(check_auth_dependency)
):
    try:
        db = dashboard_service.db
        # Генерируем экземпляры повторяющихся событий
        await dashboard_service.expand_recurrence_events()
        ctx = await get_runtime_context(db)
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
        random_rule = {"language": "Info", "rule_ru": "Нет правил", "rule_en": "No rules available"}
        try:
            rule_res = await db.execute(select(models.LanguageRule).order_by(func.random()).limit(1))
            rule_obj = rule_res.scalar_one_or_none()
            if rule_obj: random_rule = rule_obj
        except Exception as e:
            logger.warning(f"Failed to fetch random rule: {e}")

        categories_res = await db.execute(select(models.NoteCategory))
        categories = [c.name for c in categories_res.scalars().all()]
        layout_json = await get_setting(db, "dashboard_layout", "{}")

        return templates.TemplateResponse("index.html", {
            "request": request,
            "words": ctx['words'],
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
            "habits_count": lambda start_date: (today_obj.date() - start_date).days if start_date else 0
        })
    except Exception as e:
        logger.error(f"Error in dashboard index: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/history", response_class=HTMLResponse)
async def history(
    request: Request,
    date_str: str = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(check_auth_dependency)
):
    try:
        today_date = datetime.now().date()
        current_year = today_date.year

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

        return templates.TemplateResponse("history.html", {
            "request": request,
            "target_date": target_date,
            "events": events,
            "chronology": chronology,
            "notes": notes,
            "wink": wink,
            "stickers": history_stickers,
            "is_today_in_history": is_today_in_history,
            "is_fallback": False, # Теперь fallback индивидуальный для каждого виджета
            "today_for_calendar": today_date,
        })
    except Exception as e:
        logger.error(f"Error in history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/save_dashboard_layout")
async def save_dashboard_layout(request: Request, db: AsyncSession = Depends(get_db), user=Depends(check_auth_dependency)):
    try:
        data = await request.json()
        layout = data.get("layout", "{}")
        await set_setting(db, "dashboard_layout", layout)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error saving dashboard layout: {e}")
        return {"status": "error", "message": str(e)}
