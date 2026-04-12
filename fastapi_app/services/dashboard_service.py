from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from .. import models
from datetime import datetime, timedelta, date, timezone

from ..utils import normalize_date

from ..logger import logger

# Горизонт генерации повторяющихся событий (дней вперёд от сегодня)
RECURRENCE_HORIZON_DAYS = 366 * 2  # Увеличиваем до 2 лет, чтобы ежегодные события были видны на год вперёд

# Максимум экземпляров одного правила (защита от взрыва БД)
RECURRENCE_MAX_INSTANCES = 500

WEEKDAY_MAP = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}


def _parse_recurrence_rule(rule: str):
    """
    Парсит строку правила повторения.
    Форматы:
      "daily"
      "weekly"              — каждую неделю в тот же день
      "weekly:mon,wed,fri"  — каждую неделю в указанные дни
      "biweekly"
      "monthly"
      "yearly"
      "weekdays"            — пн–пт
    Возвращает (freq, weekdays_set_or_None).
    """
    if not rule:
        return None, None
    parts = rule.split(":", 1)
    freq = parts[0].strip().lower()
    weekdays = None
    if len(parts) == 2:
        weekdays = set()
        for d in parts[1].split(","):
            d = d.strip().lower()
            if d in WEEKDAY_MAP:
                weekdays.add(WEEKDAY_MAP[d])
    if freq == "weekdays":
        weekdays = {0, 1, 2, 3, 4}
        freq = "weekly"
    return freq, weekdays


def _generate_dates(start: date, freq: str, weekdays, end: date, horizon: date):
    """
    Генерирует даты повторений начиная со start (не включая сам start)
    до min(end, horizon).
    """
    limit = min(end, horizon) if end else horizon
    results = []
    current = start

    if freq == "daily":
        current += timedelta(days=1)
        while current <= limit and len(results) < RECURRENCE_MAX_INSTANCES:
            results.append(current)
            current += timedelta(days=1)

    elif freq == "weekly":
        if weekdays:
            # Генерируем каждый день и фильтруем по дням недели
            current += timedelta(days=1)
            while current <= limit and len(results) < RECURRENCE_MAX_INSTANCES:
                if current.weekday() in weekdays:
                    results.append(current)
                current += timedelta(days=1)
        else:
            current += timedelta(weeks=1)
            while current <= limit and len(results) < RECURRENCE_MAX_INSTANCES:
                results.append(current)
                current += timedelta(weeks=1)

    elif freq == "biweekly":
        current += timedelta(weeks=2)
        while current <= limit and len(results) < RECURRENCE_MAX_INSTANCES:
            results.append(current)
            current += timedelta(weeks=2)

    elif freq == "monthly":
        month = start.month
        year = start.year
        while len(results) < RECURRENCE_MAX_INSTANCES:
            month += 1
            if month > 12:
                month = 1
                year += 1
            try:
                current = start.replace(year=year, month=month)
            except ValueError:
                # Например, 31 февраля — берём последний день месяца
                import calendar
                last_day = calendar.monthrange(year, month)[1]
                current = start.replace(year=year, month=month, day=last_day)
            if current > limit:
                break
            results.append(current)

    elif freq == "yearly":
        year = start.year + 1
        while len(results) < RECURRENCE_MAX_INSTANCES:
            try:
                current = start.replace(year=year)
            except ValueError:
                current = start.replace(year=year, day=28)
            if current > limit:
                break
            results.append(current)
            year += 1

    return results

class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_index_data(self):
        data = {
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
        }

        today_dt = datetime.now()
        today_obj = today_dt.date()
        tomorrow_obj = today_obj + timedelta(days=1)

        # События (Сегодня)
        try:
            start_of_today = datetime.combine(today_obj, datetime.min.time())
            end_of_today = datetime.combine(today_obj, datetime.max.time())
            events_today_res = await self.db.execute(select(models.Event).where(
                models.Event.done == False,
                models.Event.date >= start_of_today,
                models.Event.date <= end_of_today
            ).order_by(models.Event.position, models.Event.date))
            data["events_today"] = events_today_res.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching events_today: {e}")

        # События (Завтра)
        try:
            start_of_tomorrow = datetime.combine(tomorrow_obj, datetime.min.time())
            end_of_tomorrow = datetime.combine(tomorrow_obj, datetime.max.time())
            events_tomorrow_res = await self.db.execute(select(models.Event).where(
                models.Event.done == False,
                models.Event.date >= start_of_tomorrow,
                models.Event.date <= end_of_tomorrow
            ).order_by(models.Event.position, models.Event.date))
            data["events_tomorrow"] = events_tomorrow_res.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching events_tomorrow: {e}")

        # Important-события (появляются за 3 дня до наступления)
        try:
            start_of_today = datetime.combine(today_obj, datetime.min.time())
            three_days_ahead = datetime.combine(today_obj + timedelta(days=3), datetime.max.time())
            important_res = await self.db.execute(
                select(models.Event).where(
                    models.Event.important == True,
                    models.Event.done == False,
                    models.Event.date >= start_of_today,
                    models.Event.date <= three_days_ahead,
                ).order_by(models.Event.date)
            )
            data["date_important"] = important_res.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching date_important: {e}")

        # Привычки
        try:
            habits_all_res = await self.db.execute(select(models.Habit).where(models.Habit.read == False))
            data["habits_all"] = habits_all_res.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching habits: {e}")

        # Задачи
        try:
            tasks_res = await self.db.execute(
                select(models.Task)
                .where(models.Task.done == False)
                .order_by(models.Task.position, models.Task.created_at.desc())
            )
            data["tasks"] = tasks_res.scalars().all()
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
                .where(models.StickyNote.finished_at.is_(None))
                .order_by(models.StickyNote.position.asc(), models.StickyNote.created_at.desc())
            )
            data["stickers"] = stickers_res.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching sticky notes: {e}")
            data["stickers"] = []

        # Обследования (Habit Tree)
        try:
            # Получаем все корневые активности
            # Сортируем чисто по времени (реальному или скрытому случайному для дел без времени)
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
            obs_dtos = []
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
                logs_by_obs = {}
                for log in weekly_logs:
                    if log.observation_id not in logs_by_obs:
                        logs_by_obs[log.observation_id] = []
                    logs_by_obs[log.observation_id].append(log.done_at)

                for obs in all_observations:
                    # Индексы дней недели (0=Пн, 6=Вс), когда активность была выполнена на этой неделе
                    done_days = []
                    for log_dt in logs_by_obs.get(obs.id, []):
                        done_days.append(log_dt.weekday())
                    
                    # Создаем DTO (dict) для шаблона
                    # Учитываем, что datetime в SQLite может быть наивным, нормализуем
                    obs_dto = {
                        "id": obs.id,
                        "text": obs.text,
                        "priority": obs.priority,
                        "is_main": obs.is_main,
                        "status": getattr(obs, "status", "periodic"),
                        "created_at": obs.created_at,
                        "end_time": getattr(obs, "end_time", None),
                        "no_time": getattr(obs, "no_time", False),
                        "done_days": set(done_days)  # уникальные дни
                    }
                    obs_dtos.append(obs_dto)
            
            data["observations"] = obs_dtos
        except Exception as e:
            logger.error(f"Error fetching observations: {e}")
            data["observations"] = []



        return data

    async def get_dashboard_settings(self):
        try:
            result = await self.db.execute(select(models.Dashboard))
            items = result.scalars().all()
            return {item.key: item for item in items}
        except Exception as e:
            logger.error(f"Error fetching dashboard settings: {e}")
            return {}

    async def _add_event(self, text: str, dt: datetime, is_important: bool, repeat: str, repeat_end: str):
        import uuid
        is_recurring = repeat not in (None, "none", "")
        end_date = None
        if is_recurring and repeat_end:
            try:
                end_date = date.fromisoformat(repeat_end)
            except ValueError:
                end_date = None
        if is_recurring and end_date is None:
            end_date = dt.date() + timedelta(days=365 * 10)

        r_id = str(uuid.uuid4())[:8] if is_recurring else None

        obj = models.Event(
            title=text,
            date=dt,
            important=is_important,
            recurrence_id=r_id,
            recurrence_rule=repeat if is_recurring else None,
            recurrence_end=end_date if is_recurring else None,
        )
        self.db.add(obj)
        await self.db.commit()
        if is_recurring:
            await self.expand_recurrence_events()

        result = await self.db.execute(
            select(models.Event)
            .where(models.Event.title == text)
            .order_by(models.Event.id.desc())
            .limit(1)
        )
        created = result.scalar_one_or_none()
        return created.id if created else None

    async def _add_task(self, text: str):
        obj = models.Task(name=text, done=False)
        self.db.add(obj)
        await self.db.commit()

        result = await self.db.execute(
            select(models.Task).where(models.Task.name == text)
            .order_by(models.Task.id.desc()).limit(1)
        )
        created = result.scalar_one_or_none()
        return created.id if created else None

    async def _add_habit(self, text: str, dt: datetime):
        obj = models.Habit(title=text, start_date=dt.date(), read=False)
        self.db.add(obj)
        await self.db.commit()

        result = await self.db.execute(
            select(models.Habit).where(models.Habit.title == text)
            .order_by(models.Habit.id.desc()).limit(1)
        )
        created = result.scalar_one_or_none()
        return created.id if created else None

    async def _add_wink(self, text: str, dt: datetime):
        obj = models.Wink(title=text, date=dt)
        self.db.add(obj)
        await self.db.commit()

        result = await self.db.execute(
            select(models.Wink).where(models.Wink.title == text)
            .order_by(models.Wink.id.desc()).limit(1)
        )
        created = result.scalar_one_or_none()
        return created.id if created else None

    async def _update_dashboard_widget(self, category: str, text: str, dt: datetime):
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

        result = await self.db.execute(
            select(models.Dashboard).where(models.Dashboard.key == db_key)
        )
        created = result.scalar_one_or_none()
        return created.key if created else db_key

    async def submit_form(
        self,
        category: str,
        text: str,
        dt: datetime,
        repeat: str = "none",
        repeat_end: str = "",
    ):
        """
        Универсальная логика сохранения из формы (Facade Pattern).
        """
        try:
            if category in ("event", "important"):
                return await self._add_event(text, dt, category == "important", repeat, repeat_end)
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

    async def expand_recurrence_events(self, horizon_date: date = None):
        """
        Для каждого события с recurrence_rule генерирует недостающие экземпляры
        на горизонт (по умолчанию RECURRENCE_HORIZON_DAYS дней вперёд).

        horizon_date: если задано, генерирует до этой даты включительно.
        """
        try:
            today = date.today()
            if horizon_date:
                horizon = horizon_date
            else:
                horizon = today + timedelta(days=RECURRENCE_HORIZON_DAYS)

            # Берём только «шаблонные» записи — у них recurrence_rule задан
            templates_res = await self.db.execute(
                select(
                    models.Event.id,
                    models.Event.title,
                    models.Event.date,
                    models.Event.important,
                    models.Event.recurrence_id,
                    models.Event.recurrence_rule,
                    models.Event.recurrence_end
                ).where(models.Event.recurrence_rule.isnot(None))
            )
            templates = templates_res.all()

            for tmpl in templates:
                end = tmpl.recurrence_end  # date или None
                freq, weekdays = _parse_recurrence_rule(tmpl.recurrence_rule)
                if not freq:
                    continue

                start = tmpl.date.date() if isinstance(tmpl.date, datetime) else tmpl.date

                # Находим все уже существующие даты экземпляров этого правила
                existing_res = await self.db.execute(
                    select(models.Event.date).where(
                        models.Event.recurrence_id == tmpl.recurrence_id,
                        models.Event.id != tmpl.id,
                    )
                )
                existing_dates = {
                    (r.date() if isinstance(r, datetime) else r)
                    for r in existing_res.scalars().all()
                }

                # Генерируем даты на горизонт
                new_dates = _generate_dates(start, freq, weekdays, end, horizon)

                added = 0
                for d in new_dates:
                    if d not in existing_dates:
                        new_event = models.Event(
                            title=tmpl.title,
                            date=datetime.combine(d, tmpl.date.time() if isinstance(tmpl.date, datetime) else datetime.min.time()),
                            important=tmpl.important,
                            done=False,
                            recurrence_id=tmpl.recurrence_id,
                            recurrence_rule=None,   # экземпляры не шаблоны
                            recurrence_end=None,
                        )
                        self.db.add(new_event)
                        added += 1

                if added:
                    logger.debug(f"[RECURRENCE] Added {added} instances for event '{tmpl.title}' (id={tmpl.id})")

            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in expand_recurrence_events: {e}", exc_info=True)

    async def add_chronology(self, text: str, dt: datetime):
        """
        Сохраняет хронологию и перечитывает для гарантии.
        Возвращает ID созданной записи.
        """
        try:
            chrono = models.Chronology(title=text, date=dt)
            self.db.add(chrono)
            await self.db.commit()

            # ✅ ПРОВЕРКА: перечитываем из БД для гарантии сохранения
            result = await self.db.execute(
                select(models.Chronology)
                .where(models.Chronology.title == text)
                .order_by(models.Chronology.id.desc())
                .limit(1)
            )
            created = result.scalar_one_or_none()
            return created.id if created else None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in DashboardService.add_chronology: {e}", exc_info=True)
            raise

    async def update_chronology(self, chrono_id: int, text: str, dt: datetime):
        """
        Обновляет существующую запись хронологии по ID.
        """
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

    async def mark_task_done(self, task_id: int):
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

    async def mark_event_done(self, event_id: int):
        try:
            res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = res.scalar_one_or_none()
            if event:
                event.done = True
                await self.db.commit()
                return True
            return False
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error marking event {event_id} done: {e}")
            raise

    async def mark_habit_done(self, habit_id: int):
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

    async def reorder_tasks(self, task_ids: list[int]):
        try:
            for index, task_id in enumerate(task_ids):
                res = await self.db.execute(select(models.Task).where(models.Task.id == task_id))
                task = res.scalar_one_or_none()
                if task:
                    task.position = index
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error reordering tasks: {e}")
            return False

    async def reorder_events(self, event_ids: list[int]):
        try:
            for index, event_id in enumerate(event_ids):
                res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
                event = res.scalar_one_or_none()
                if event:
                    event.position = index
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error reordering events: {e}")
            return False

    async def update_event_date(self, event_id: int, new_date_str: str):
        """new_date_str can be 'today' or 'tomorrow' or ISO date"""
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
