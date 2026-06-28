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

        # 5. Обследования (Observation Tree) - Limit to 5 for widget
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

    async def get_dashboard_page_context(
        self, word_service: Any, state_manager: Any
    ) -> Dict[str, Any]:
        """Собирает полный контекст для отображения шаблона dashboard.html."""
        import json
        from .settings_service import get_setting

        ctx = await state_manager.get_runtime_context()
        today_obj = datetime.now()
        today_actual = today_obj.date()
        today_for_calendar = today_actual - timedelta(days=1)

        dash_data = await self.get_index_data()
        dashboard_map = await self.get_dashboard_settings()

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

        categories_res = await self.db.execute(select(models.NoteCategory))
        categories = [c.name for c in categories_res.scalars().all()]
        
        layout_json = await get_setting(self.db, "dashboard_layout", "{}")

        active_langs_raw = await get_setting(self.db, 'active_languages', 'en,it,de')
        active_langs = [l.strip() for l in (active_langs_raw or 'en,it,de').split(',') if l.strip()]
        
        lang_names_raw = await get_setting(self.db, 'language_names', '{}')
        event_colors_raw = await get_setting(self.db, 'event_colors', '{}')
        try:
            lang_names = json.loads(lang_names_raw if lang_names_raw else '{}')
        except Exception:
            lang_names = {}

        try:
            event_colors = json.loads(event_colors_raw if event_colors_raw else '{}')
        except Exception:
            event_colors = {}

        sentences_json = word_service.get_sentences_json()
        try:
            sentences = json.loads(sentences_json)
            sentence_langs = set(s.get("language") for s in sentences if s.get("language"))
        except Exception:
            sentence_langs = set()

        ns_res = await self.db.execute(select(models.Notes).where(models.Notes.category == "Language Learning System"))
        anchor_notes = ns_res.scalars().all()
        lang_anchors = {note.note: note.id for note in anchor_notes}
        
        for lang in sentence_langs:
            if lang not in lang_anchors:
                new_anchor = models.Notes(category="Language Learning System", note=lang)
                self.db.add(new_anchor)
                await self.db.commit()
                await self.db.refresh(new_anchor)
                lang_anchors[lang] = new_anchor.id

        plugin_events = str(await get_setting(self.db, 'plugin_events', 'True')).lower() in ('true', '1')
        plugin_tasks = str(await get_setting(self.db, 'plugin_tasks', 'True')).lower() in ('true', '1')
        plugin_habits = str(await get_setting(self.db, 'plugin_habits', 'True')).lower() in ('true', '1')
        plugin_languages = str(await get_setting(self.db, 'plugin_languages', 'True')).lower() in ('true', '1')
        show_widget_tips = str(await get_setting(self.db, 'show_widget_tips', 'True')).lower() in ('true', '1')
        show_dedications = str(await get_setting(self.db, 'show_dedications', 'True')).lower() in ('true', '1')

        return {
            "words": ctx['words'],
            "active_languages": active_langs,
            "all_languages": lang_names,
            "event_colors": event_colors,
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
            "categories": categories,
            "dashboard_layout": layout_json,
            "today_for_calendar": today_for_calendar,
            "today_actual": today_actual,
            "now_utc": datetime.now(timezone.utc).replace(tzinfo=None),
            "stickers": dash_data.get('stickers', []),
            "observations": dash_data.get('observations', []),
            "pinned_notes": dash_data.get('pinned_notes', []),
            "habits_count": lambda start_date: (today_obj.date() - start_date).days if start_date else 0,
            "lang_anchors_json": json.dumps(lang_anchors),
            "sentences_json": sentences_json,
            "plugin_events": plugin_events,
            "plugin_tasks": plugin_tasks,
            "plugin_habits": plugin_habits,
            "plugin_languages": plugin_languages,
            "show_widget_tips": show_widget_tips,
            "show_dedications": show_dedications
        }

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
