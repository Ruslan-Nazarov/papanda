from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func, delete
from datetime import datetime, timedelta, date, timezone
from typing import Optional, List, Dict, Any, Union

from .. import models
from ..utils import normalize_date
from ..logger import logger

from .event_service import EventService
from .task_service import TaskService
from .habit_service import HabitService
from .chronology_service import ChronologyService
from .wink_service import WinkService
from .sticky_note_service import StickyNoteService
from .note_service import NoteService
from .observation_service import ObservationService

class DashboardService:
    """
    Фасадный сервис для работы с главной страницей (Dashboard).
    Агрегирует данные из специализированных сервисов.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.events = EventService(db)
        self.tasks = TaskService(db)
        self.habits = HabitService(db)
        self.chronology = ChronologyService(db)
        self.winks = WinkService(db)
        self.sticky_notes = StickyNoteService(db)
        self.notes = NoteService(db)
        self.observations_service = ObservationService(db)

    async def get_index_data(self) -> Dict[str, Any]:
        """Собирает все данные для главной страницы."""
        data: Dict[str, Any] = {
            "today_for_calendar": datetime.now().date(),
            "events_today": [],
            "events_tomorrow": [],
            "date_important": [],
            "habits_all": [],
            "tasks": [],
            "title_until": "...",
            "days_remaining": 0,
            "title_after": "...",
            "days_passed": 0,
            "now_utc": datetime.now(timezone.utc).replace(tzinfo=None),
            "observations": [],
            "pinned_notes": [],
        }

        today_dt = datetime.now()
        today_obj = today_dt.date()
        tomorrow_obj = today_obj + timedelta(days=1)

        # 1. События
        try:
            start_of_today = datetime.combine(today_obj, datetime.min.time())
            end_of_today = datetime.combine(today_obj, datetime.max.time())
            data["events_today"] = await self.events.get_events_for_range(start_of_today, end_of_today)

            start_of_tomorrow = datetime.combine(tomorrow_obj, datetime.min.time())
            end_of_tomorrow = datetime.combine(tomorrow_obj, datetime.max.time())
            data["events_tomorrow"] = await self.events.get_events_for_range(start_of_tomorrow, end_of_tomorrow)

            three_days_ahead = datetime.combine(today_obj + timedelta(days=3), datetime.max.time())
            data["date_important"] = await self.events.get_events_for_range(start_of_today, three_days_ahead, only_important=True)
        except Exception as e:
            logger.error(f"Error fetching dashboard events: {e}")

        # 2. Привычки и задачи
        try:
            data["habits_all"] = await self.habits.get_active_habits()
            data["tasks"] = await self.tasks.get_active_tasks()
        except Exception as e:
            logger.error(f"Error fetching dashboard items: {e}")

        # 3. Виджеты (Dashboard settings)
        try:
            dashboard_items_res = await self.db.execute(select(models.Dashboard))
            dashboard_map = {item.key: item for item in dashboard_items_res.scalars().all()}

            for key, attr in [("count_until", "days_remaining"), ("count_after", "days_passed")]:
                if key in dashboard_map:
                    item = dashboard_map[key]
                    prefix = "title_until" if key == "count_until" else "title_after"
                    data[prefix] = item.title
                    dt = normalize_date(item.date)
                    if dt:
                        data[attr] = abs((dt - today_obj).days) if key == "count_until" else abs((today_obj - dt).days)
        except Exception as e:
            logger.error(f"Error fetching dashboard widgets: {e}")

        # 4. Стикеры (Standalone Sticky Thoughts)
        try:
            data["stickers"] = await self.sticky_notes.get_active_notes()
        except Exception as e:
            logger.error(f"Error fetching sticky notes: {e}")

        # 5. Обследования (Observation Tree)
        try:
            data["observations"] = await self.observations_service.get_dashboard_observations(today_obj)
        except Exception as e:
            logger.error(f"Error fetching observations: {e}")

        # 6. Закрепленные заметки
        try:
            data["pinned_notes"] = await self.notes.get_pinned_notes()
        except Exception as e:
            logger.error(f"Error fetching pinned_notes: {e}")

        return data

    async def submit_form(self, category: str, text: str, dt: datetime, repeat: str = "none", repeat_end: str = "", sticker_data: Optional[Dict[str, Any]] = None, color: Optional[str] = None) -> Union[int, str, None]:
        """Универсальный метод сохранения из формы."""
        try:
            if category in ("event", "important"):
                return await self.events.add_event(text, dt, category == "important", repeat, repeat_end, sticker_data=sticker_data, color=color)
            elif category == "task":
                return await self.tasks.add_task(text)
            elif category == "habits":
                return await self.habits.add_habit(text, dt.date())
            elif category == "wink":
                return await self.winks.add_wink(text, dt)
            elif category in ("count until", "count after", "one_thing", "replacement"):
                return await self._update_dashboard_widget(category, text, dt)
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in submit_form: {e}")
            raise

    async def _update_dashboard_widget(self, category: str, text: str, dt: datetime) -> str:
        db_key = category.replace(" ", "_")
        await self.db.execute(delete(models.Dashboard).where(models.Dashboard.key == db_key))
        obj = models.Dashboard(key=db_key, title=text, date=dt)
        self.db.add(obj)
        await self.db.commit()
        return db_key

    async def get_dashboard_settings(self) -> Dict[str, models.Dashboard]:
        res = await self.db.execute(select(models.Dashboard))
        return {item.key: item for item in res.scalars().all()}
