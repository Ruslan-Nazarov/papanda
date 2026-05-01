from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from .. import models
from datetime import datetime, timedelta, date, timezone
from typing import Optional, List, Set, Tuple, Dict, Any, Union

from ..utils import (
    normalize_date, parse_recurrence_rule, generate_dates_rrule, 
    get_virtual_event_instances, attach_stickers_count,
    RECURRENCE_HORIZON_DAYS, RECURRENCE_MAX_INSTANCES
)
from ..logger import logger
import uuid
from sqlalchemy import select, func, delete


class DashboardService:
    """Сервис для работы с главной страницей (Dashboard)."""
    
    def __init__(self, db: AsyncSession):
        """
        Инициализирует сервис.
        
        Args:
            db: Асинхронная сессия SQLAlchemy.
        """
        self.db = db

    async def _get_events_for_range(self, start_dt: datetime, end_dt: datetime, only_important: bool = False) -> List[models.Event]:
        """
        Возвращает список событий (физических и виртуальных) для указанного диапазона.
        """
        # 1. Физические события (включая выполненные клоны)
        stmt = select(models.Event).where(
            models.Event.date >= start_dt,
            models.Event.date <= end_dt
        )
        if only_important:
            stmt = stmt.where(models.Event.important == True)
            
        res = await self.db.execute(stmt.order_by(models.Event.position, models.Event.date))
        physical_events_raw = list(res.scalars().all())
        
        # Индекс физических событий по (recurrence_id, date) для подавления виртуальных
        physical_map = {}
        for ev in physical_events_raw:
            if ev.recurrence_id:
                d_key = ev.date.date() if isinstance(ev.date, datetime) else ev.date
                key = (ev.recurrence_id, d_key)
                physical_map[key] = ev

        # 2. Шаблоны повторяющихся событий
        tmpl_stmt = select(models.Event).where(models.Event.recurrence_rule.isnot(None))
        if only_important:
            tmpl_stmt = tmpl_stmt.where(models.Event.important == True)
            
        tmpl_res = await self.db.execute(tmpl_stmt)
        templates = tmpl_res.scalars().all()
        
        # 3. Исключения (fetch once for optimization)
        exc_stmt = select(models.RecurrenceException).where(
            models.RecurrenceException.exception_date >= start_dt.date(),
            models.RecurrenceException.exception_date <= end_dt.date()
        )
        exc_res = await self.db.execute(exc_stmt)
        all_exc = exc_res.scalars().all()
        exc_map = {}
        for e in all_exc:
            if e.recurrence_id not in exc_map:
                exc_map[e.recurrence_id] = set()
            exc_map[e.recurrence_id].add(e.exception_date)

        # Генерируем виртуальные события через общий хелпер
        virtual_events = get_virtual_event_instances(
            templates=templates,
            physical_map=physical_map,
            exc_map=exc_map,
            start_dt=start_dt,
            end_dt=end_dt,
            event_class=models.Event
        )

        # Фильтруем физические события для отображения (на дашборде только невыполненные)
        physical_events = [ev for ev in physical_events_raw if ev.done == False]
        
        combined = physical_events + virtual_events
        # Сортировка по позиции и времени
        combined.sort(key=lambda x: (x.position or 0, x.date))
        return combined

    async def get_index_data(self) -> Dict[str, Any]:
        """
        Собирает все данные, необходимые для отрисовки главной страницы.
        
        Returns:
            Dict[str, Any]: Словарь с событиями, задачами, привычками и настройками дашборда.
        """
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
            "pinned_smart_note": None,
        }

        today_dt = datetime.now()
        today_obj = today_dt.date()
        tomorrow_obj = today_obj + timedelta(days=1)

        # События (Сегодня)
        try:
            start_of_today = datetime.combine(today_obj, datetime.min.time())
            end_of_today = datetime.combine(today_obj, datetime.max.time())
            data["events_today"] = await self._get_events_for_range(start_of_today, end_of_today)
        except Exception as e:
            logger.error(f"Error fetching events_today: {e}")

        # События (Завтра)
        try:
            start_of_tomorrow = datetime.combine(tomorrow_obj, datetime.min.time())
            end_of_tomorrow = datetime.combine(tomorrow_obj, datetime.max.time())
            data["events_tomorrow"] = await self._get_events_for_range(start_of_tomorrow, end_of_tomorrow)
        except Exception as e:
            logger.error(f"Error fetching events_tomorrow: {e}")

        # Important-события (появляются за 3 дня до наступления)
        try:
            start_of_today = datetime.combine(today_obj, datetime.min.time())
            three_days_ahead = datetime.combine(today_obj + timedelta(days=3), datetime.max.time())
            data["date_important"] = await self._get_events_for_range(start_of_today, three_days_ahead, only_important=True)
        except Exception as e:
            logger.error(f"Error fetching date_important: {e}")

        # Привычки
        try:
            habits_all_res = await self.db.execute(select(models.Habit).where(models.Habit.read == False))
            habits_all = habits_all_res.scalars().all()
            
            # Fetch stickers for these habits
            await attach_stickers_count(self.db, habits_all, 'habit_id', models.StickyNote)
            
            data["habits_all"] = habits_all
        except Exception as e:
            logger.error(f"Error fetching habits: {e}")

        # Задачи
        try:
            tasks_res = await self.db.execute(
                select(models.Task)
                .where(models.Task.done == False)
                .order_by(models.Task.position, models.Task.created_at.desc())
            )
            tasks = tasks_res.scalars().all()
            
            # Fetch stickers for these tasks
            await attach_stickers_count(self.db, tasks, 'task_id', models.StickyNote)
            
            data["tasks"] = tasks
        except Exception as e:
            logger.error(f"Error fetching tasks: {e}")

        # Dashboard элементы
        try:
            dashboard_items_res = await self.db.execute(select(models.Dashboard))
            dashboard_items = dashboard_items_res.scalars().all()
            dashboard_map = {item.key: item for item in dashboard_items}

            if "count_until" in dashboard_map:
                item = dashboard_map["count_until"]
                data["title_until"] = item.title
                dt = normalize_date(item.date)
                if dt: data["days_remaining"] = (dt - today_obj).days

            if "count_after" in dashboard_map:
                item = dashboard_map["count_after"]
                data["title_after"] = item.title
                dt = normalize_date(item.date)
                if dt: data["days_passed"] = (today_obj - dt).days
        except Exception as e:
            logger.error(f"Error fetching dashboard items: {e}")

        # Стикеры (Sticky Thoughts)
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
            data["stickers"] = []

        # Обследования (Habit Tree)
        try:
            # Получаем все корневые активности
            obs_res = await self.db.execute(
                select(models.Observation)
                .order_by(
                    func.time(models.Observation.created_at).asc()
                )
            )
            all_observations = obs_res.scalars().all()

            # Вычисляем начало текущей недели (понедельник)
            start_of_week = today_obj - timedelta(days=today_obj.weekday())
            start_of_week_dt = datetime.combine(start_of_week, datetime.min.time())

            # Собираем логи за эту неделю
            obs_dtos: List[Dict[str, Any]] = []
            if all_observations:
                obs_ids = [o.id for o in all_observations]
                logs_res = await self.db.execute(
                    select(models.ObservationLog)
                    .where(
                        models.ObservationLog.observation_id.in_(obs_ids),
                        models.ObservationLog.done_at >= start_of_week_dt
                    )
                )
                weekly_logs = logs_res.scalars().all()

                # Группируем логи по observation_id
                logs_by_obs: Dict[int, List[datetime]] = {}
                for log in weekly_logs:
                    if log.observation_id not in logs_by_obs:
                        logs_by_obs[log.observation_id] = []
                    logs_by_obs[log.observation_id].append(log.done_at)

                for obs in all_observations:
                    # Индексы дней недели (0=Пн, 6=Вс)
                    done_days = []
                    for log_dt in logs_by_obs.get(obs.id, []):
                        done_days.append(log_dt.weekday())
                    
                    obs_dto: Dict[str, Any] = {
                        "id": obs.id,
                        "text": obs.text,
                        "priority": obs.priority,
                        "is_main": obs.is_main,
                        "status": getattr(obs, "status", "periodic"),
                        "created_at": obs.created_at,
                        "end_time": getattr(obs, "end_time", None),
                        "no_time": getattr(obs, "no_time", False),
                        "done_days": done_days
                    }
                    data["observations"].append(obs_dto)
        except Exception as e:
            logger.error(f"Error fetching habit tree data: {e}", exc_info=True)
            data["observations"] = []

        # Закрепленные заметки (regular notes)
        try:
            from sqlalchemy.orm import selectinload
            pinned_res = await self.db.execute(
                select(models.Notes)
                .options(selectinload(models.Notes.stickers))
                .where(models.Notes.is_pinned == True)
                .order_by(models.Notes.created_at.desc())
            )
            pinned_notes = pinned_res.scalars().all()
            
            for n in pinned_notes:
                # Текст заметки уже плоский, обрезаем для превью
                n.preview = (n.note[:100] + '...') if len(n.note) > 100 else n.note
                n.title = f"[{n.category}]" if n.category else f"Note #{n.id}"
            
            data["pinned_notes"] = pinned_notes
        except Exception as e:
            logger.error(f"Error fetching pinned_notes: {e}")

        return data

    async def get_dashboard_settings(self) -> Dict[str, models.Dashboard]:
        """Возвращает все настройки дашборда (из модели Dashboard) в виде словаря."""
        try:
            res = await self.db.execute(select(models.Dashboard))
            items = res.scalars().all()
            return {item.key: item for item in items}
        except Exception as e:
            logger.error(f"Error fetching dashboard settings: {e}")
            return {}

    async def _add_event(self, text: str, dt: datetime, is_important: bool, repeat: str, repeat_end: str, sticker_data: Optional[Dict[str, Any]] = None, color: Optional[str] = None) -> int:
        """
        Внутренний метод для добавления нового события.
        
        Args:
            text: Заголовок события.
            dt: Дата и время.
            is_important: Флаг важности.
            repeat: Правило повторения (строка).
            repeat_end: Дата окончания повторения (ISO строка).
            sticker_data: Данные для создания привязанного стикера.
            color: Цвет события (HEX).
            
        Returns:
            int: ID созданного события.
        """
        import uuid
        is_recurring = repeat not in (None, "none", "")
        end_date: Optional[date] = None
        if is_recurring and repeat_end:
            try:
                end_date = date.fromisoformat(repeat_end)
            except ValueError:
                end_date = None
        if is_recurring and end_date is None:
            # По умолчанию на 10 лет вперед
            end_date = dt.date() + timedelta(days=365 * 10)

        r_id = str(uuid.uuid4())[:8] if is_recurring else None

        obj = models.Event(
            title=text,
            date=dt,
            important=is_important,
            recurrence_id=r_id,
            recurrence_rule=repeat if is_recurring else None,
            recurrence_end=end_date if is_recurring else None,
            color=color
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)

        if sticker_data and (sticker_data.get("text") or sticker_data.get("title")):
            from .sticky_note_service import StickyNoteService
            sns = StickyNoteService(self.db)
            s_payload = {
                **sticker_data,
                "event_id": obj.id,
                "recurrence_id": obj.recurrence_id if sticker_data.get("apply_series") else None
            }
            await sns.create_note(s_payload)

        return obj.id

    async def _add_task(self, text: str) -> int:
        """Добавляет новую задачу."""
        obj = models.Task(name=text, done=False)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj.id

    async def _add_habit(self, text: str, dt: datetime) -> int:
        """Добавляет новую привычку."""
        obj = models.Habit(title=text, start_date=dt.date(), read=False)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj.id

    async def _add_wink(self, text: str, dt: datetime) -> int:
        """Добавляет новую 'мигалку' (Wink)."""
        obj = models.Wink(title=text, date=dt)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj.id

    async def _update_dashboard_widget(self, category: str, text: str, dt: datetime) -> str:
        """Обновляет виджет на дашборде."""
        db_key = category.replace(" ", "_")
        old_item_res = await self.db.execute(
            select(models.Dashboard).where(models.Dashboard.key == db_key)
        )
        old_item = old_item_res.scalar_one_or_none()
        if old_item:
            await self.db.delete(old_item)
        obj = models.Dashboard(key=db_key, title=text, date=dt)
        self.db.add(obj)
        await self.db.commit()

        return db_key

    async def submit_form(
        self,
        category: str,
        text: str,
        dt: datetime,
        repeat: str = "none",
        repeat_end: str = "",
        sticker_data: Optional[Dict[str, Any]] = None,
        color: Optional[str] = None
    ) -> Union[int, str, None]:
        """
        Универсальная логика сохранения из формы (Facade Pattern).
        
        Args:
            category: Категория (event, task, habits, etc.).
            text: Текст/Заголовок.
            dt: Дата и время.
            repeat: Правило повторения.
            repeat_end: Конец повторения.
            sticker_data: Данные стикера.
            color: Цвет элемента.
            
        Returns:
            Созданный ID или ключ.
        """
        try:
            if category in ("event", "important"):
                return await self._add_event(text, dt, category == "important", repeat, repeat_end, sticker_data=sticker_data, color=color)
            elif category == "task":
                return await self._add_task(text)
            elif category == "habits":
                return await self._add_habit(text, dt)
            elif category == "wink":
                return await self._add_wink(text, dt)
            elif category in ("count until", "count after", "one_thing", "replacement"):
                return await self._update_dashboard_widget(category, text, dt)

            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in DashboardService.submit_form: {e}", exc_info=True)
            raise







    async def add_chronology(self, text: str, dt: datetime) -> Optional[int]:
        """
        Сохраняет хронологию и возвращает ID созданной записи.
        """
        try:
            chrono = models.Chronology(title=text, date=dt)
            self.db.add(chrono)
            await self.db.commit()
            await self.db.refresh(chrono)
            return chrono.id
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in DashboardService.add_chronology: {e}", exc_info=True)
            raise

    async def update_chronology(self, chrono_id: int, text: str, dt: datetime) -> bool:
        """Обновляет существующую запись хронологии."""
        try:
            res = await self.db.execute(select(models.Chronology).where(models.Chronology.id == chrono_id))
            chrono = res.scalar_one_or_none()
            if not chrono:
                return False
            
            chrono.title = text
            chrono.date = dt
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in DashboardService.update_chronology: {e}", exc_info=True)
            raise

    async def mark_task_done(self, task_id: int) -> bool:
        """Помечает задачу как выполненную."""
        try:
            res = await self.db.execute(select(models.Task).where(models.Task.id == task_id))
            task = res.scalar_one_or_none()
            if task:
                task.done = True
                await self.db.commit()
                return True
            return False
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error marking task {task_id} done: {e}")
            raise

    async def mark_event_done(self, event_id: int, event_date: Optional[str] = None) -> bool:
        """Помечает событие как выполненное."""
        try:
            res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = res.scalar_one_or_none()
            
            if event:
                if event.recurrence_rule and event_date:
                    # Это шаблон повторяющегося события, а мы помечаем конкретный день
                    # Создаем физический клон с done=True
                    target_date = date.fromisoformat(event_date)
                    
                    # Проверяем, не существует ли уже такой клон
                    existing_clone_res = await self.db.execute(
                        select(models.Event).where(
                            models.Event.recurrence_id == event.recurrence_id,
                            func.date(models.Event.date) == target_date
                        )
                    )
                    existing_clone = existing_clone_res.scalar_one_or_none()
                    
                    if existing_clone:
                        existing_clone.done = True
                    else:
                        # Сохраняем время из оригинального шаблона, меняем только дату
                        event_time = event.date.time() if isinstance(event.date, datetime) else datetime.min.time()
                        new_event = models.Event(
                            title=event.title,
                            date=datetime.combine(target_date, event_time),
                            important=event.important,
                            done=True,
                            recurrence_id=event.recurrence_id,
                            recurrence_rule=None, # Это физический экземпляр
                            color=event.color,
                            position=event.position
                        )
                        self.db.add(new_event)
                else:
                    # Одиночное событие или уже физический клон
                    event.done = True
                
                await self.db.commit()
                return True
            return False
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error marking event {event_id} done: {e}")
            raise

    async def mark_habit_done(self, habit_id: int) -> bool:
        """Помечает привычку как выполненную (отмеченную)."""
        try:
            res = await self.db.execute(select(models.Habit).where(models.Habit.id == habit_id))
            habit = res.scalar_one_or_none()
            if habit:
                habit.read = True
                habit.end_date = date.today()
                await self.db.commit()
                return True
            return False
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error marking habit {habit_id} done: {e}")
            raise

    async def reorder_tasks(self, task_ids: List[int]) -> bool:
        """Обновляет порядок задач."""
        try:
            res = await self.db.execute(select(models.Task).where(models.Task.id.in_(task_ids)))
            tasks = {t.id: t for t in res.scalars().all()}
            for index, task_id in enumerate(task_ids):
                if task_id in tasks:
                    tasks[task_id].position = index
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error reordering tasks: {e}")
            return False

    async def reorder_events(self, event_ids: List[int]) -> bool:
        """Обновляет порядок событий."""
        try:
            res = await self.db.execute(select(models.Event).where(models.Event.id.in_(event_ids)))
            events = {e.id: e for e in res.scalars().all()}
            for index, event_id in enumerate(event_ids):
                if event_id in events:
                    events[event_id].position = index
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error reordering events: {e}")
            return False

    async def update_event_date(self, event_id: int, new_date_str: str) -> bool:
        """Обновляет дату события (сохраняя время)."""
        try:
            res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = res.scalar_one_or_none()
            if not event:
                return False

            now = datetime.now()
            if new_date_str == 'today':
                target_date = now.date()
            elif new_date_str == 'tomorrow':
                target_date = now.date() + timedelta(days=1)
            else:
                target_date = date.fromisoformat(new_date_str)

            # Сохраняем время, меняем только дату
            event_time = event.date.time() if isinstance(event.date, datetime) else datetime.min.time()
            event.date = datetime.combine(target_date, event_time)
            
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating event date: {e}")
            return False

    async def toggle_event_done(self, event_id: int) -> Optional[bool]:
        """Переключает статус события на противоположный и возвращает новый статус."""
        try:
            res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = res.scalar_one_or_none()
            if event:
                event.done = not event.done
                await self.db.commit()
                return event.done
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error toggling event {event_id}: {e}")
            raise

    async def delete_event(self, event_id: int, mode: Optional[str] = None, event_date: Optional[str] = None) -> bool:
        """Удаляет событие с учетом повторений (Динамическая версия)."""
        from sqlalchemy import delete, select
        try:
            event_res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = event_res.scalar_one_or_none()
            
            if not event:
                return False
                
            mode = (mode or "").strip().lower()
            # Определяем дату целевого события (из аргумента или из объекта)
            target_date = date.fromisoformat(event_date) if event_date else (event.date.date() if isinstance(event.date, datetime) else event.date)

            if event.recurrence_id:
                if mode == "only":
                    # Добавляем дату в исключения
                    exception = models.RecurrenceException(
                        recurrence_id=event.recurrence_id,
                        exception_date=target_date
                    )
                    self.db.add(exception)
                    
                    # Если это физический объект (не Template), удаляем его
                    if not event.recurrence_rule and (event.date.date() if isinstance(event.date, datetime) else event.date) == target_date:
                        await self.db.delete(event)
                    
                elif mode == "all":
                    # Удаляем всю серию
                    await self.db.execute(delete(models.Event).where(models.Event.recurrence_id == event.recurrence_id))
                    await self.db.execute(delete(models.RecurrenceException).where(models.RecurrenceException.recurrence_id == event.recurrence_id))
                    
                elif mode == "this_and_future":
                    # Обрезаем шаблон
                    tmpl_res = await self.db.execute(select(models.Event).where(models.Event.recurrence_id == event.recurrence_id, models.Event.recurrence_rule.isnot(None)))
                    tmpl = tmpl_res.scalar_one_or_none()
                    if tmpl:
                        tmpl.recurrence_end = target_date - timedelta(days=1)
                    
                    # Удаляем физические события (done клоны) этой серии с датой >= target_date
                    await self.db.execute(delete(models.Event).where(
                        models.Event.recurrence_id == event.recurrence_id, 
                        models.Event.date >= datetime.combine(target_date, datetime.min.time()),
                        models.Event.recurrence_rule.is_(None)
                    ))
                    
                elif mode == "future_only":
                    # Обрезаем шаблон
                    tmpl_res = await self.db.execute(select(models.Event).where(models.Event.recurrence_id == event.recurrence_id, models.Event.recurrence_rule.isnot(None)))
                    tmpl = tmpl_res.scalar_one_or_none()
                    if tmpl:
                        tmpl.recurrence_end = target_date
                    
                    # Удаляем физические события (done клоны) этой серии с датой > target_date
                    await self.db.execute(delete(models.Event).where(
                        models.Event.recurrence_id == event.recurrence_id, 
                        models.Event.date > datetime.combine(target_date, datetime.max.time()),
                        models.Event.recurrence_rule.is_(None)
                    ))
            else:
                # Одиночное событие
                await self.db.delete(event)
            
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting event {event_id}: {e}")
            raise

    async def update_event_inline(self, data: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        """
        Редактирует событие или создает новое (Inline). 
        Возвращает (успех, сообщение, id_события).
        """
        from ..utils import parse_date_input
        
        event_id = data.get("id")
        
        # Парсинг даты
        new_dt: Optional[datetime] = None
        if "date" in data and data["date"]:
            new_dt = parse_date_input(str(data["date"]))
            if isinstance(new_dt, date) and not isinstance(new_dt, datetime):
                new_dt = datetime.combine(new_dt, datetime.min.time())
        
        new_rec_rule: Optional[str] = data.get("recurrence_rule")
        new_rec_end: Optional[date] = None
        if "recurrence_end" in data and data["recurrence_end"]:
            try:
                new_rec_end = date.fromisoformat(str(data["recurrence_end"]))
            except ValueError:
                new_rec_end = None

        new_color: Optional[str] = data.get("color")
        edit_mode: str = data.get("edit_mode", "only")
        rec_id: Optional[str] = data.get("recurrence_id")

        try:
            # Безопасный парсинг ID
            parsed_id = None
            if event_id:
                try:
                    parsed_id = int(event_id)
                except (ValueError, TypeError):
                    parsed_id = None

            if not parsed_id:
                # СОЗДАНИЕ НОВОГО
                import uuid
                is_recurring = new_rec_rule not in (None, "none", "")
                r_id = str(uuid.uuid4())[:8] if is_recurring else None

                event = models.Event(
                    title=data.get("title", "New Event"),
                    date=new_dt or datetime.now(),
                    color=new_color,
                    important=bool(data.get("important", False)),
                    done=False,
                    recurrence_id=r_id,
                    recurrence_rule=new_rec_rule,
                    recurrence_end=new_rec_end
                )
                self.db.add(event)
                await self.db.flush()
                event_id = event.id
            else:
                # РЕДАКТИРОВАНИЕ
                res = await self.db.execute(select(models.Event).where(models.Event.id == parsed_id))
                event = res.scalar_one_or_none()
                if not event:
                    return False, "Event not found", None

                if rec_id and edit_mode == "all":
                    # Обновляем шаблон серии и все исторические клоны
                    stmt = select(models.Event).where(models.Event.recurrence_id == rec_id)
                    res_all = await self.db.execute(stmt)
                    related_events = list(res_all.scalars().all())
                    
                    for e in related_events:
                        if "title" in data: e.title = str(data["title"])
                        if "color" in data: e.color = new_color
                        if "important" in data: e.important = bool(data["important"])
                        if new_dt:
                            e_time = new_dt.time()
                            e_date = e.date.date() if isinstance(e.date, datetime) else e.date
                            e.date = datetime.combine(e_date, e_time)
                        
                        # Обновляем правила только у шаблона
                        if e.recurrence_rule is not None:
                            if "recurrence_rule" in data: e.recurrence_rule = new_rec_rule
                            if "recurrence_end" in data: e.recurrence_end = new_rec_end
                            # Если дата шаблона меняется, это меняет всю серию
                            if new_dt: e.date = new_dt

                elif rec_id and edit_mode == "this_and_future":
                    # Разделение серии
                    orig_date_str = data.get("original_date")
                    if orig_date_str:
                        try:
                            # Убираем время если оно там есть для парсинга только даты
                            orig_date = datetime.fromisoformat(orig_date_str.split('T')[0]).date()
                        except:
                            orig_date = event.date.date() if isinstance(event.date, datetime) else event.date
                    else:
                        orig_date = event.date.date() if isinstance(event.date, datetime) else event.date

                    # 1. Завершаем текущую серию
                    tmpl_res = await self.db.execute(select(models.Event).where(models.Event.recurrence_id == rec_id, models.Event.recurrence_rule.isnot(None)))
                    tmpl = tmpl_res.scalar_one_or_none()
                    if tmpl:
                        tmpl.recurrence_end = orig_date - timedelta(days=1)
                    
                    # 2. Создаем новую серию
                    import uuid
                    new_rid = str(uuid.uuid4())[:8]
                    new_tmpl = models.Event(
                        title=str(data.get("title", event.title)),
                        date=new_dt or event.date,
                        color=new_color or event.color,
                        important=bool(data.get("important", event.important)),
                        done=False,
                        recurrence_id=new_rid,
                        recurrence_rule=new_rec_rule or (tmpl.recurrence_rule if tmpl else None),
                        recurrence_end=new_rec_end or (tmpl.recurrence_end if tmpl else None)
                    )
                    self.db.add(new_tmpl)
                    
                    # 3. Удаляем физические клоны >= orig_date
                    await self.db.execute(delete(models.Event).where(
                        models.Event.recurrence_id == rec_id,
                        models.Event.date >= datetime.combine(orig_date, datetime.min.time()),
                        models.Event.recurrence_rule.is_(None)
                    ))
                    event = new_tmpl # Для привязки стикеров ниже

                elif rec_id and edit_mode == "only":
                    # Исключаем эту дату из серии и создаем одиночное событие
                    orig_date_str = data.get("original_date")
                    if orig_date_str:
                        try:
                            orig_date = datetime.fromisoformat(orig_date_str.split('T')[0]).date()
                        except:
                            orig_date = event.date.date() if isinstance(event.date, datetime) else event.date
                    else:
                        orig_date = event.date.date() if isinstance(event.date, datetime) else event.date

                    # 1. Новое одиночное событие
                    new_event = models.Event(
                        title=str(data.get("title", event.title)),
                        date=new_dt or event.date,
                        color=new_color or event.color,
                        important=bool(data.get("important", event.important)),
                        done=event.done,
                        recurrence_id=None,
                        recurrence_rule=None
                    )
                    self.db.add(new_event)
                    
                    # 2. Исключение
                    self.db.add(models.RecurrenceException(recurrence_id=rec_id, exception_date=orig_date))
                    
                    # 3. Если редактировали физический клон (не шаблон), удаляем его
                    if not event.recurrence_rule:
                        await self.db.delete(event)
                    
                    event = new_event # Для стикеров

                else:
                    # Одиночное обновление (не в серии)
                    if "title" in data: event.title = str(data["title"])
                    if new_dt: event.date = new_dt
                    if "color" in data: event.color = new_color
                    if "recurrence_rule" in data: 
                        event.recurrence_rule = new_rec_rule
                        if event.recurrence_rule and not event.recurrence_id:
                            import uuid
                            event.recurrence_id = str(uuid.uuid4())[:8]
                    if "recurrence_end" in data: event.recurrence_end = new_rec_end

            from .sticky_note_service import StickyNoteService
            sns = StickyNoteService(self.db)
            stickers_data: List[Dict[str, Any]] = data.get("stickers", [])
            for s in stickers_data:
                s_payload = {
                    **s,
                    "event_id": event.id,
                    "recurrence_id": rec_id if s.get("apply_series") else None
                }
                await sns.create_note(s_payload)

            await self.db.commit()
            await self.expand_recurrence_events()
            return True, "Success", event_id

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in update_event_inline: {e}")
            return False, str(e), None
