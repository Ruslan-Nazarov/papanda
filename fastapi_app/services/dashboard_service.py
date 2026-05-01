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
            stickers_res = await self.db.execute(
                select(models.StickyNote)
                .options(selectinload(models.StickyNote.note))
                .where(
                    models.StickyNote.finished_at.is_(None),
                    models.StickyNote.event_id.is_(None),
                    models.StickyNote.recurrence_id.is_(None),
                    models.StickyNote.task_id.is_(None),
                    models.StickyNote.habit_id.is_(None),
                    models.StickyNote.note_id.is_(None),
                    models.StickyNote.smart_note_id.is_(None)
                )
                .order_by(models.StickyNote.position.asc(), models.StickyNote.created_at.desc())
            )
            data["stickers"] = stickers_res.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching sticky notes: {e}")

        # 5. Обследования (Observation Tree)
        try:
            obs_res = await self.db.execute(select(models.Observation).order_by(func.time(models.Observation.created_at).asc()))
            all_observations = obs_res.scalars().all()
            start_of_week_dt = datetime.combine(today_obj - timedelta(days=today_obj.weekday()), datetime.min.time())

            if all_observations:
                logs_res = await self.db.execute(
                    select(models.ObservationLog)
                    .where(models.ObservationLog.observation_id.in_([o.id for o in all_observations]), models.ObservationLog.done_at >= start_of_week_dt)
                )
                logs_by_obs = {}
                for log in logs_res.scalars().all():
                    logs_by_obs.setdefault(log.observation_id, []).append(log.done_at.weekday())

                for obs in all_observations:
                    data["observations"].append({
                        "id": obs.id, "text": obs.text, "priority": obs.priority, "is_main": obs.is_main,
                        "status": getattr(obs, "status", "periodic"), "created_at": obs.created_at,
                        "done_days": logs_by_obs.get(obs.id, [])
                    })
        except Exception as e:
            logger.error(f"Error fetching observations: {e}")

        # 6. Закрепленные заметки
        try:
            pinned_res = await self.db.execute(
                select(models.Notes)
                .options(selectinload(models.Notes.stickers))
                .where(models.Notes.is_pinned == True)
                .order_by(models.Notes.created_at.desc())
            )
            data["pinned_notes"] = pinned_res.scalars().all()
            for n in data["pinned_notes"]:
                n.preview = (n.note[:100] + '...') if len(n.note) > 100 else n.note
                n.title = f"[{n.category}]" if n.category else f"Note #{n.id}"
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
