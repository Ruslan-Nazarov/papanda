from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, or_, and_
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any, Tuple, Union
import uuid

from .. import models
from ..utils import (
    normalize_date, parse_recurrence_rule, generate_dates_rrule, 
    get_virtual_event_instances, attach_stickers_count
)
from ..logger import logger

class EventService:
    """Сервис для работы с событиями (Events)."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_events_for_range(self, start_dt: datetime, end_dt: datetime, only_important: bool = False) -> List[models.Event]:
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

    async def add_event(self, text: str, dt: datetime, is_important: bool, repeat: str, repeat_end: str, sticker_data: Optional[Dict[str, Any]] = None, color: Optional[str] = None) -> int:
        """Добавляет новое событие."""
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

    async def mark_event_done(self, event_id: int, event_date: Optional[str] = None) -> bool:
        """Помечает событие как выполненное."""
        try:
            res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = res.scalar_one_or_none()
            
            if event:
                if event.recurrence_rule and event_date:
                    target_date = date.fromisoformat(event_date)
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
                        event_time = event.date.time() if isinstance(event.date, datetime) else datetime.min.time()
                        new_event = models.Event(
                            title=event.title,
                            date=datetime.combine(target_date, event_time),
                            important=event.important,
                            done=True,
                            recurrence_id=event.recurrence_id,
                            recurrence_rule=None,
                            color=event.color,
                            position=event.position
                        )
                        self.db.add(new_event)
                else:
                    event.done = True
                
                await self.db.commit()
                return True
            return False
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error marking event {event_id} done: {e}")
            raise

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

            event_time = event.date.time() if isinstance(event.date, datetime) else datetime.min.time()
            event.date = datetime.combine(target_date, event_time)
            
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating event date: {e}")
            return False

    async def toggle_event_done(self, event_id: int) -> Optional[bool]:
        """Переключает статус события на противоположный."""
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
        """Удаляет событие с учетом повторений."""
        try:
            event_res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = event_res.scalar_one_or_none()
            
            if not event:
                return False
                
            mode = (mode or "").strip().lower()
            target_date = date.fromisoformat(event_date) if event_date else (event.date.date() if isinstance(event.date, datetime) else event.date)

            if event.recurrence_id:
                if mode == "only":
                    self.db.add(models.RecurrenceException(recurrence_id=event.recurrence_id, exception_date=target_date))
                    if not event.recurrence_rule and (event.date.date() if isinstance(event.date, datetime) else event.date) == target_date:
                        await self.db.delete(event)
                elif mode == "all":
                    await self.db.execute(delete(models.Event).where(models.Event.recurrence_id == event.recurrence_id))
                    await self.db.execute(delete(models.RecurrenceException).where(models.RecurrenceException.recurrence_id == event.recurrence_id))
                elif mode == "this_and_future":
                    tmpl_res = await self.db.execute(select(models.Event).where(models.Event.recurrence_id == event.recurrence_id, models.Event.recurrence_rule.isnot(None)))
                    tmpl = tmpl_res.scalar_one_or_none()
                    if tmpl: tmpl.recurrence_end = target_date - timedelta(days=1)
                    await self.db.execute(delete(models.Event).where(
                        models.Event.recurrence_id == event.recurrence_id, 
                        models.Event.date >= datetime.combine(target_date, datetime.min.time()),
                        models.Event.recurrence_rule.is_(None)
                    ))
                elif mode == "future_only":
                    tmpl_res = await self.db.execute(select(models.Event).where(models.Event.recurrence_id == event.recurrence_id, models.Event.recurrence_rule.isnot(None)))
                    tmpl = tmpl_res.scalar_one_or_none()
                    if tmpl: tmpl.recurrence_end = target_date
                    await self.db.execute(delete(models.Event).where(
                        models.Event.recurrence_id == event.recurrence_id, 
                        models.Event.date > datetime.combine(target_date, datetime.max.time()),
                        models.Event.recurrence_rule.is_(None)
                    ))
            else:
                await self.db.delete(event)
            
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting event {event_id}: {e}")
            raise

    async def update_event_inline(self, data: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        """Inline редактирование события."""
        from ..utils import parse_date_input
        
        event_id = data.get("id")
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
            parsed_id = int(event_id) if event_id and str(event_id).isdigit() else None

            if not parsed_id:
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
                res = await self.db.execute(select(models.Event).where(models.Event.id == parsed_id))
                event = res.scalar_one_or_none()
                if not event: return False, "Event not found", None

                if rec_id and edit_mode == "all":
                    res_all = await self.db.execute(select(models.Event).where(models.Event.recurrence_id == rec_id))
                    related_events = res_all.scalars().all()
                    for e in related_events:
                        if "title" in data: e.title = str(data["title"])
                        if "color" in data: e.color = new_color
                        if "important" in data: e.important = bool(data["important"])
                        if new_dt:
                            e.date = datetime.combine(e.date.date() if isinstance(e.date, datetime) else e.date, new_dt.time())
                        if e.recurrence_rule is not None:
                            if "recurrence_rule" in data: e.recurrence_rule = new_rec_rule
                            if "recurrence_end" in data: e.recurrence_end = new_rec_end
                            if new_dt: e.date = new_dt

                elif rec_id and edit_mode == "this_and_future":
                    orig_date_str = data.get("original_date")
                    orig_date = date.fromisoformat(orig_date_str.split('T')[0]) if orig_date_str else (event.date.date() if isinstance(event.date, datetime) else event.date)
                    
                    tmpl_res = await self.db.execute(select(models.Event).where(models.Event.recurrence_id == rec_id, models.Event.recurrence_rule.isnot(None)))
                    tmpl = tmpl_res.scalar_one_or_none()
                    if tmpl: tmpl.recurrence_end = orig_date - timedelta(days=1)
                    
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
                    await self.db.execute(delete(models.Event).where(
                        models.Event.recurrence_id == rec_id,
                        models.Event.date >= datetime.combine(orig_date, datetime.min.time()),
                        models.Event.recurrence_rule.is_(None)
                    ))
                    event = new_tmpl

                elif rec_id and edit_mode == "only":
                    orig_date_str = data.get("original_date")
                    orig_date = date.fromisoformat(orig_date_str.split('T')[0]) if orig_date_str else (event.date.date() if isinstance(event.date, datetime) else event.date)
                    
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
                    self.db.add(models.RecurrenceException(recurrence_id=rec_id, exception_date=orig_date))
                    if not event.recurrence_rule: await self.db.delete(event)
                    event = new_event

                else:
                    if "title" in data: event.title = str(data["title"])
                    if new_dt: event.date = new_dt
                    if "color" in data: event.color = new_color
                    if "recurrence_rule" in data: 
                        event.recurrence_rule = new_rec_rule
                        if event.recurrence_rule and not event.recurrence_id:
                            event.recurrence_id = str(uuid.uuid4())[:8]
                    if "recurrence_end" in data: event.recurrence_end = new_rec_end

            # Stickers
            stickers_data = data.get("stickers", [])
            if stickers_data:
                from .sticky_note_service import StickyNoteService
                sns = StickyNoteService(self.db)
                for s in stickers_data:
                    await sns.create_note({**s, "event_id": event.id, "recurrence_id": rec_id if s.get("apply_series") else None})

            await self.db.commit()
            return True, "Success", event_id
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in update_event_inline: {e}")
            return False, str(e), None
