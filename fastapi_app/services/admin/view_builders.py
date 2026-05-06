from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, extract
from datetime import datetime, date, timedelta
import calendar
from typing import Optional, List, Dict, Any, Tuple

from ... import models
from ...utils import get_virtual_event_instances, attach_stickers_count
from ...logger import logger

class ViewBuilders:
    """Вспомогательный класс для построения специализированных представлений БД."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_events_view(self, Model, month: int, year: int, day: Optional[int], search: Optional[str]) -> Tuple[List[Any], Dict[str, Any]]:
        last_day = calendar.monthrange(year, month)[1]
        start_range = datetime(year, month, 1) - timedelta(days=10)
        end_range = datetime(year, month, last_day) + timedelta(days=10)
        
        query = select(Model)
        if search:
            query = query.where(Model.title.ilike(f"%{search}%"))
        else:
            query = query.where(and_(Model.date >= start_range, Model.date <= end_range))
            if day:
                query = query.where(extract('day', Model.date) == day)
        
        res = await self.db.execute(query.order_by(Model.date.asc()))
        physical_events = list(res.scalars().all())
        
        physical_map = {}
        for ev in physical_events:
            if ev.recurrence_id:
                d_key = ev.date.date() if isinstance(ev.date, datetime) else ev.date
                physical_map[(ev.recurrence_id, d_key)] = ev
        
        # Шаблоны и виртуальные события
        tmpl_res = await self.db.execute(select(Model).where(Model.recurrence_rule.isnot(None)))
        templates = tmpl_res.scalars().all()
        
        exc_res = await self.db.execute(select(models.RecurrenceException))
        all_exceptions = exc_res.scalars().all()
        exc_map = {}
        for e in all_exceptions:
            if e.recurrence_id not in exc_map: exc_map[e.recurrence_id] = set()
            exc_map[e.recurrence_id].add(e.exception_date)

        virtual_events = get_virtual_event_instances(
            templates=templates, physical_map=physical_map, exc_map=exc_map,
            start_dt=start_range, end_dt=end_range, event_class=models.Event
        )

        records = physical_events + virtual_events
        records.sort(key=lambda x: x.date)
        
        # Проверка стикеров
        await self._attach_stickers_info(records)

        from ...services.settings_service import get_setting
        import json
        event_colors_raw = await get_setting(self.db, 'event_colors', '{}')
        try: event_colors = json.loads(event_colors_raw)
        except: event_colors = {}

        extra = {
            "current_month": month, "current_day": day, "current_year": year,
            "search_query": search, "month_name": date(year, month, 1).strftime('%B'),
            "prev_month": (date(year, month, 1) - timedelta(days=1)).month,
            "next_month": (date(year, month, 1) + timedelta(days=32)).month,
            "years": [y for y in range(datetime.now().year - 5, datetime.now().year + 6)],
            "months": [(m, date(2000, m, 1).strftime('%B')) for m in range(1, 13)],
            "event_colors": event_colors,
        }
        return records, extra

    async def _attach_stickers_info(self, records: List[Any]):
        for r in records: r.has_stickers = False
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
            data = stickers_res.all()
            ids_with = {s.event_id for s in data if s.event_id}
            recs_with = {s.recurrence_id for s in data if s.recurrence_id}
            for r in records:
                r.has_stickers = (r.id in ids_with or r.recurrence_id in recs_with)

    async def get_habits_view(self, Model, search: Optional[str] = None) -> Tuple[List[Any], Dict[str, Any]]:
        query = select(Model)
        if search:
            query = query.where(Model.title.ilike(f"%{search}%"))
        res = await self.db.execute(query.order_by(Model.read.asc(), Model.start_date.desc()))
        records = list(res.scalars().all())
        await attach_stickers_count(self.db, records, 'habit_id', models.StickyNote)
        return records, {"search_query": search}

    async def get_tasks_view(self, Model, search: Optional[str] = None) -> Tuple[List[Any], Dict[str, Any]]:
        query = select(Model)
        if search:
            query = query.where(Model.name.ilike(f"%{search}%"))
        res = await self.db.execute(query.order_by(Model.done.asc(), Model.created_at.desc()))
        records = list(res.scalars().all())
        await attach_stickers_count(self.db, records, 'task_id', models.StickyNote)
        return records, {"search_query": search}

    async def get_wink_view(self, Model, search: Optional[str] = None) -> Tuple[List[Any], Dict[str, Any]]:
        query = select(Model)
        if search:
            query = query.where(Model.title.ilike(f"%{search}%"))
        res = await self.db.execute(query.order_by(Model.date.desc()))
        records = list(res.scalars().all())
        return records, {"search_query": search}

    async def get_chronology_view(self, Model, search: Optional[str]) -> Tuple[List[Any], Dict[str, Any]]:
        query = select(Model)
        if search: query = query.where(Model.title.ilike(f"%{search}%"))
        res = await self.db.execute(query.order_by(Model.date.desc()))
        return list(res.scalars().all()), {"seven_days_ago": datetime.now() - timedelta(days=7), "search_query": search}

    async def get_notes_view(self, Model, category: Optional[str], sort: Optional[str], search: Optional[str]) -> Tuple[List[Any], Dict[str, Any]]:
        cats_res = await self.db.execute(select(models.NoteCategory))
        categories = [c.name for c in cats_res.scalars().all()]
        
        q = select(Model)
        if category: q = q.where(Model.category == category)
        if search: q = q.where(Model.note.ilike(f"%{search}%"))
        
        if sort == "category": q = q.order_by(Model.category.asc(), Model.created_at.desc())
        else: q = q.order_by(Model.created_at.desc())

        records = list((await self.db.execute(q)).scalars().all())
        
        if records:
            record_ids = [r.id for r in records]
            s_res = await self.db.execute(select(models.StickyNote).where(models.StickyNote.note_id.in_(record_ids), models.StickyNote.finished_at.is_(None)))
            all_stickers = s_res.scalars().all()
            s_map = {}
            for s in all_stickers:
                if s.note_id not in s_map: s_map[s.note_id] = []
                s_map[s.note_id].append(s)
            
            for r in records:
                raw_s = s_map.get(r.id, [])
                r.stickers_list = [{"id": s.id, "text": s.text, "title": s.title, "color": s.color} for s in raw_s]
                r.stickers_count = len(r.stickers_list)
        
        return records, {"categories": categories, "selected_category": category, "sort_by": sort, "search_query": search}

    async def get_stickers_view(self, Model, category: Optional[str], sort: Optional[str], search: Optional[str], page: int, page_size: int) -> Tuple[List[Any], Dict[str, Any]]:
        from sqlalchemy.orm import selectinload
        q = select(Model).options(selectinload(Model.task), selectinload(Model.habit), selectinload(Model.note), selectinload(Model.event))
        
        def apply_filters(query):
            if category == 'standalone': query = query.where(Model.task_id.is_(None), Model.habit_id.is_(None), Model.note_id.is_(None), Model.event_id.is_(None), Model.recurrence_id.is_(None))
            elif category == 'task': query = query.where(Model.task_id.isnot(None))
            elif category == 'habit': query = query.where(Model.habit_id.isnot(None))
            elif category == 'note': query = query.where(Model.note_id.isnot(None))
            elif category == 'event': query = query.where(or_(Model.event_id.isnot(None), Model.recurrence_id.isnot(None)))
            elif category == 'finished': query = query.where(Model.finished_at.isnot(None))
            elif category == 'active': query = query.where(Model.finished_at.is_(None))
            elif category in ['text', 'list']: query = query.where(Model.type == category)
            if search: query = query.where(or_(Model.text.ilike(f"%{search}%"), Model.title.ilike(f"%{search}%")))
            return query

        q = apply_filters(q)
        if sort == "title": q = q.order_by(Model.title.asc(), Model.created_at.desc())
        else: q = q.order_by(Model.created_at.desc())

        total_res = await self.db.execute(apply_filters(select(func.count(Model.id))))
        total_count = total_res.scalar_one()
        
        records = list((await self.db.execute(q.limit(page_size).offset((page - 1) * page_size))).scalars().all())
        return records, {"selected_category": category, "sort_by": sort, "search_query": search, "current_page": page, "total_pages": (total_count + page_size - 1) // page_size, "total_count": total_count}
