from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, and_, or_, extract, inspect
from datetime import datetime, date, timedelta
import calendar
from typing import Optional, List, Dict, Any, Union, Type
from .. import models
from ..utils import generate_dates_rrule, get_virtual_event_instances, attach_stickers_count
from ..logger import logger

class AdminService:
    """Сервис для административных функций: просмотр и редактирование таблиц БД."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.MODEL_MAP = {
            'Event': models.Event, 
            'Habit': models.Habit, 
            'Task': models.Task, 
            'HabitsDone': models.HabitsDone,
            'Chronology': models.Chronology, 
            'Notes': models.Notes, 
            'Wink': models.Wink, 
            'WordStats': models.WordStats,
            'Stickers': models.StickyNote
        }

    def get_model(self, name: str) -> Optional[Type[Any]]:
        """Возвращает класс модели по имени."""
        if name == 'Habits': name = 'Habit'
        return self.MODEL_MAP.get(name)

    async def update_item(self, model_name: str, item_id: Union[int, str], data: Dict[str, Any]) -> bool:
        """Обновляет запись в БД по её ID и предоставленным данным, выполняя приведение типов."""
        from ..utils import parse_date_input

        Model = self.get_model(model_name)
        if not Model:
            return False
            
        pk_name = 'word' if model_name == 'WordStats' else 'id'
        res = await self.db.execute(select(Model).where(getattr(Model, pk_name) == item_id))
        item = res.scalar_one_or_none()
        if not item:
            return False
            
        columns = [c.name for c in Model.__table__.columns]
        for col in columns:
            if col in [pk_name, 'created_at']: continue
            if col not in data: continue

            val = data[col]
            
            # Приведение типов на основе SQLAlchemy модели
            col_attr = getattr(Model, col)
            if hasattr(col_attr.type, 'python_type'):
                col_type = col_attr.type.python_type
                
                # 1. Даты
                if issubclass(col_type, (date, datetime)) and val:
                    val = parse_date_input(str(val))
                    if col_type == date and isinstance(val, datetime):
                        val = val.date()
                
                # 2. Булевы
                elif col_type == bool:
                    val = str(val).lower() in ['true', '1', 'on']
                
                # 3. Числа
                elif col_type == int and val:
                    try: val = int(val)
                    except ValueError: pass

            setattr(item, col, val)

        # Специальная логика для привычек
        if model_name == 'Habit' and 'read' in data:
            if item.read and not item.end_date:
                item.end_date = date.today()
            elif not item.read:
                item.end_date = None

        await self.db.commit()
        logger.info(f"[AdminService] Updated {model_name} {pk_name}={item_id}")
        return True

    async def get_db_view_context(
        self, 
        model_name: str, 
        month: Optional[int] = None, 
        day: Optional[int] = None,
        year: Optional[int] = None, 
        search: Optional[str] = None,
        category: Optional[str] = None,
        sort: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Собирает данные для универсального просмотрщика таблиц.
        """
        Model = self.get_model(model_name)
        if not Model:
            raise ValueError(f"Model {model_name} not found")

        now = datetime.now()
        i_month = month or now.month
        i_year = year or now.year
        i_day = day
        s_search = search.strip() if search and search.strip() else None

        records = []
        extra_ctx = {}

        # Специализированная логика для разные моделей
        if model_name == 'Event':
            records, extra_ctx = await self._get_events_view(Model, i_month, i_year, i_day, s_search)
        elif model_name == 'Habit':
            records = await self._get_habits_view(Model)
        elif model_name == 'Task':
            records = await self._get_tasks_view(Model)
        elif model_name == 'Chronology':
            records, extra_ctx = await self._get_chronology_view(Model, s_search)
        elif model_name == 'Notes':
            records, extra_ctx = await self._get_notes_view(Model, category, sort, s_search)
        elif model_name == 'Wink':
            records = await self._get_winks_view(Model)
        elif model_name == 'Stickers':
            records, extra_ctx = await self._get_stickers_view(Model, category, sort, s_search, page, page_size)
        else:
            # Общее поведение
            query = select(Model)
            if hasattr(Model, 'id'):
                query = query.order_by(Model.id.desc())
            res = await self.db.execute(query)
            records = list(res.scalars().all())

        # Общее количество записей в таблице (без фильтров) для счетчика в шапке
        total_in_db_res = await self.db.execute(select(func.count()).select_from(Model))
        total_in_db = total_in_db_res.scalar() or 0

        ctx = {
            "records": records,
            "columns": [c.name for c in Model.__table__.columns],
            "model_name": model_name,
            "total_in_db": total_in_db,
            "now_iso": now.date().isoformat(),
            "today_date": now.date(),
            **extra_ctx
        }
        return ctx



    async def _get_events_view(self, Model, month, year, day, search):
        last_day = calendar.monthrange(year, month)[1]
        start_range = datetime(year, month, 1) - timedelta(days=10)
        end_range = datetime(year, month, last_day) + timedelta(days=10)
        
        # 1. Физические события и шаблоны
        query = select(Model)
        if search:
            query = query.where(Model.title.ilike(f"%{search}%"))
        else:
            query = query.where(and_(Model.date >= start_range, Model.date <= end_range))
            if day:
                query = query.where(extract('day', Model.date) == day)
        
        res = await self.db.execute(query.order_by(Model.date.asc()))
        physical_events_raw = list(res.scalars().all())
        
        # Индекс физических событий по (recurrence_id, date)
        physical_map = {}
        for ev in physical_events_raw:
            if ev.recurrence_id:
                # Используем только дату (без времени) для ключа
                d_key = ev.date.date() if isinstance(ev.date, datetime) else ev.date
                key = (ev.recurrence_id, d_key)
                physical_map[key] = ev
        
        # Для Admin View оставляем ВСЕ физические события (включая клоны)
        physical_events = physical_events_raw
        
        # 2. Шаблоны
        tmpl_stmt = select(Model).where(Model.recurrence_rule.isnot(None))
        tmpl_res = await self.db.execute(tmpl_stmt)
        templates = tmpl_res.scalars().all()
        
        # 3. Исключения
        exc_res = await self.db.execute(select(models.RecurrenceException))
        all_exceptions = exc_res.scalars().all()
        exc_map = {}
        for e in all_exceptions:
            if e.recurrence_id not in exc_map: exc_map[e.recurrence_id] = set()
            exc_map[e.recurrence_id].add(e.exception_date)

        # Генерируем виртуальные события через хелпер
        virtual_events = get_virtual_event_instances(
            templates=templates,
            physical_map=physical_map,
            exc_map=exc_map,
            start_dt=start_range,
            end_dt=end_range,
            event_class=models.Event
        )

        # Объединяем
        records = physical_events + virtual_events
        records.sort(key=lambda x: x.date)
        
        # Initialize sticker flag
        for r in records:
            r.has_stickers = False

        # Оптимизированная проверка стикеров
        event_ids = [r.id for r in records]
        rec_ids = [r.recurrence_id for r in records if r.recurrence_id]
        
        if event_ids or rec_ids:
            stickers_res = await self.db.execute(
                select(models.StickyNote.event_id, models.StickyNote.recurrence_id)
                .where(
                    models.StickyNote.finished_at.is_(None),
                    or_(
                        models.StickyNote.event_id.in_(event_ids) if event_ids else False,
                        models.StickyNote.recurrence_id.in_(rec_ids) if rec_ids else False
                    )
                )
            )
            stickers_data = stickers_res.all()
            ids_with_stickers = {s.event_id for s in stickers_data if s.event_id}
            recs_with_stickers = {s.recurrence_id for s in stickers_data if s.recurrence_id}

            for r in records:
                r.has_stickers = (r.id in ids_with_stickers or r.recurrence_id in recs_with_stickers)

        prev_date = date(year, month, 1) - timedelta(days=1)
        next_date = date(year, month, 1) + timedelta(days=32)
        
        from ..services.settings_service import get_setting
        import json
        event_colors_raw = await get_setting(self.db, 'event_colors', '{}')
        try:
            event_colors = json.loads(event_colors_raw)
        except Exception:
            event_colors = {}

        extra = {
            "current_month": month,
            "current_day": day,
            "current_year": year,
            "search_query": search,
            "month_name": date(year, month, 1).strftime('%B'),
            "prev_month": prev_date.month,
            "prev_year": prev_date.year,
            "next_month": next_date.month,
            "next_year": next_date.year,
            "years": [y for y in range(datetime.now().year - 5, datetime.now().year + 6)],
            "months": [(m, date(2000, m, 1).strftime('%B')) for m in range(1, 13)],
            "event_colors": event_colors,
        }
        return records, extra

    async def _get_habits_view(self, Model):
        query = select(Model).order_by(Model.read.asc(), Model.start_date.desc())
        res = await self.db.execute(query)
        records = list(res.scalars().all())
        await attach_stickers_count(self.db, records, 'habit_id', models.StickyNote)
        return records

    async def _get_tasks_view(self, Model):
        query = select(Model).order_by(Model.done.asc(), Model.created_at.desc())
        res = await self.db.execute(query)
        records = list(res.scalars().all())
        await attach_stickers_count(self.db, records, 'task_id', models.StickyNote)
        return records

    async def _get_chronology_view(self, Model, search):
        query = select(Model)
        if search:
            query = query.where(Model.title.ilike(f"%{search}%"))
        res = await self.db.execute(query.order_by(Model.date.desc()))
        records = list(res.scalars().all())
        return records, {"seven_days_ago": datetime.now() - timedelta(days=7), "search_query": search}

    async def _get_notes_view(self, Model, category, sort, search):
        cats_res = await self.db.execute(select(models.NoteCategory))
        categories = [c.name for c in cats_res.scalars().all()]
        
        q = select(Model)
        if category:
            q = q.where(Model.category == category)
        if search:
            q = q.where(Model.note.ilike(f"%{search}%"))

        if sort == "category":
            q = q.order_by(Model.category.asc(), Model.created_at.desc())
        else:
            q = q.order_by(Model.created_at.desc())

        res = await self.db.execute(q)
        records = list(res.scalars().all())
        
        # Attach stickers list to each record
        if records:
            record_ids = [r.id for r in records]
            s_res = await self.db.execute(
                select(models.StickyNote)
                .where(models.StickyNote.note_id.in_(record_ids), models.StickyNote.finished_at.is_(None))
            )
            all_stickers = s_res.scalars().all()
            s_map = {}
            for s in all_stickers:
                if s.note_id not in s_map: s_map[s.note_id] = []
                s_map[s.note_id].append(s)
            
            for r in records:
                raw_stickers = s_map.get(r.id, [])
                r.stickers_list = [
                    {"id": s.id, "text": s.text, "title": s.title, "color": s.color} 
                    for s in raw_stickers
                ]
                r.stickers_count = len(r.stickers_list)
        return records, {
            "categories": categories, 
            "selected_category": category, 
            "sort_by": sort, 
            "search_query": search
        }

    async def _get_winks_view(self, Model):
        query = select(Model).order_by(models.Wink.date.desc())
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def _get_stickers_view(self, Model, category, sort, search, page=1, page_size=20):
        """
        Specialized view for Stickers (StickyNotes).
        'category' acts as 'type' filter.
        Shows ALL stickers now, but filtered by category if provided.
        """
        from sqlalchemy.orm import selectinload
        # 1. Base Query with relations
        q = select(Model).options(
            selectinload(Model.task),
            selectinload(Model.habit),
            selectinload(Model.note),
            selectinload(Model.event)
        )
        
        # 2. Filtering logic
        def apply_filters(query):
            if category == 'standalone':
                query = query.where(Model.task_id.is_(None), Model.habit_id.is_(None), Model.note_id.is_(None), Model.event_id.is_(None), Model.recurrence_id.is_(None))
            elif category == 'task':
                query = query.where(Model.task_id.isnot(None))
            elif category == 'habit':
                query = query.where(Model.habit_id.isnot(None))
            elif category == 'note':
                query = query.where(Model.note_id.isnot(None))
            elif category == 'event':
                query = query.where(or_(Model.event_id.isnot(None), Model.recurrence_id.isnot(None)))
            elif category == 'finished':
                query = query.where(Model.finished_at.isnot(None))
            elif category == 'active':
                query = query.where(Model.finished_at.is_(None))
            elif category in ['text', 'list']:
                query = query.where(Model.type == category)

            if search:
                query = query.where(or_(
                    Model.text.ilike(f"%{search}%"),
                    Model.title.ilike(f"%{search}%")
                ))
            return query

        q = apply_filters(q)

        if sort == "title":
            q = q.order_by(Model.title.asc(), Model.created_at.desc())
        else:
            q = q.order_by(Model.created_at.desc())

        # 3. Count total for pagination
        total_q = select(func.count(Model.id))
        total_q = apply_filters(total_q)
            
        total_res = await self.db.execute(total_q)
        total_count = total_res.scalar_one()
        total_pages = (total_count + page_size - 1) // page_size

        # Fetch page
        q = q.limit(page_size).offset((page - 1) * page_size)
        res = await self.db.execute(q)
        records = list(res.scalars().all())
        return records, {
            "selected_category": category, 
            "sort_by": sort, 
            "search_query": search,
            "current_page": page,
            "total_pages": total_pages,
            "total_count": total_count
        }
