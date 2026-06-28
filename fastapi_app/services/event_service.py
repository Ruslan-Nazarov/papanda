from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, or_, and_
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any, Tuple, Union
import uuid

from .. import models
from .base_service import BaseService
from .event.recurrence_manager import RecurrenceManager
from ..utils import (
    normalize_date, parse_recurrence_rule, generate_dates_rrule, 
    get_virtual_event_instances, attach_stickers_count, parse_date_input
)
from ..logger import logger

class EventService(BaseService):
    """Сервис для работы с событиями (Events). Наследует базовые CRUD операции."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.recurrence = RecurrenceManager(db)

    async def get_events_for_range(self, start_dt: datetime, end_dt: datetime, only_important: bool = False) -> List[models.Event]:
        """Возвращает список событий (физических и виртуальных) для указанного диапазона."""
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
        
        # 3. Исключения
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

        # Генерируем виртуальные события
        virtual_events = get_virtual_event_instances(
            templates=templates,
            physical_map=physical_map,
            exc_map=exc_map,
            start_dt=start_dt,
            end_dt=end_dt,
            event_class=models.Event
        )

        # Фильтруем физические события для отображения
        valid_physical = []
        for ev in physical_events_raw:
            if ev.done:
                continue
            ev_date = ev.date.date() if isinstance(ev.date, datetime) else ev.date
            if ev.recurrence_rule is not None:
                if ev.recurrence_end and ev.recurrence_end < ev_date:
                    continue
                if ev.recurrence_id and ev.recurrence_id in exc_map and ev_date in exc_map[ev.recurrence_id]:
                    continue
            valid_physical.append(ev)
        physical_events = valid_physical
        
        combined = physical_events + virtual_events
        combined.sort(key=lambda x: (x.position or 0, x.date))
        
        from ..utils import attach_event_stickers_count
        await attach_event_stickers_count(self.db, combined, models.StickyNote)
        
        return combined

    async def add_event(self, text: str, dt: datetime, is_important: bool, repeat: str, repeat_end: str, sticker_data: Optional[Dict[str, Any]] = None, color: Optional[str] = None) -> int:
        """Добавляет новое событие."""
        is_recurring = repeat not in (None, "none", "")
        end_date: Optional[date] = None
        if is_recurring and repeat_end:
            try: end_date = date.fromisoformat(repeat_end)
            except ValueError: end_date = None
        
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

    async def mark_event_done(self, event_id: int, event_date: Optional[str] = None, recurrence_id: Optional[str] = None) -> bool:
        """Помечает событие как выполненное. Использует RecurrenceManager для серий."""
        try:
            res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = res.scalar_one_or_none()
            
            if not event: return False

            # Если передан recurrence_id — используем его (для виртуальных экземпляров)
            effective_rec_id = recurrence_id or event.recurrence_id

            if effective_rec_id and event_date:
                # Убеждаемся, что у event проставлен recurrence_id для RecurrenceManager
                if not event.recurrence_id:
                    event.recurrence_id = effective_rec_id
                await self.recurrence.handle_completion(event, event_date)
            else:
                event.done = True
            
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error marking event {event_id} done: {e}")
            raise

    async def toggle_event_done(self, event_id: int) -> Optional[bool]:
        """Переключает статус события (использует BaseService)."""
        return await self.toggle_boolean(models.Event, event_id, "done")

    async def update_event_date(self, event_id: int, new_date: str) -> bool:
        """Переносит событие на новую дату (today/tomorrow или ISO-строку), сохраняя время."""
        try:
            res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = res.scalar_one_or_none()
            if not event: return False

            now = datetime.now()
            if new_date == 'today':
                target = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif new_date == 'tomorrow':
                target = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            else:
                target = datetime.fromisoformat(new_date)

            # Сохраняем время исходного события
            original_time = event.date.time() if isinstance(event.date, datetime) else datetime.min.time()
            event.date = datetime.combine(target.date(), original_time)

            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating event {event_id} date: {e}")
            return False

    async def delete_event(self, event_id: int, mode: Optional[str] = None, event_date: Optional[str] = None) -> bool:
        """Удаляет событие с учетом повторений (через RecurrenceManager)."""
        try:
            event_res = await self.db.execute(select(models.Event).where(models.Event.id == event_id))
            event = event_res.scalar_one_or_none()
            if not event: return False
                
            mode = (mode or "").strip().lower()
            target_date = date.fromisoformat(event_date) if event_date else (event.date.date() if isinstance(event.date, datetime) else event.date)

            await self.recurrence.handle_deletion(event, mode, target_date)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting event {event_id}: {e}")
            raise

    async def update_event_inline(self, data: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        """
        Inline редактирование события. 
        Метод декомпозирован для читаемости.
        """
        event_id = data.get("id")
        try:
            parsed_id = int(event_id) if event_id and str(event_id).isdigit() else None
            
            if not parsed_id:
                # 1. Создание нового
                event = await self._create_new_from_inline(data)
                event_id = event.id
            else:
                # 2. Обновление существующего
                res = await self.db.execute(select(models.Event).where(models.Event.id == parsed_id))
                event = res.scalar_one_or_none()
                if not event: return False, "Event not found", None
                
                await self._process_inline_update(event, data)

            # 3. Привязка стикеров
            await self._process_inline_stickers(event, data.get("stickers", []), event.recurrence_id)

            await self.db.commit()
            return True, "Success", event_id
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in update_event_inline: {e}")
            return False, str(e), None

    # --- Приватные методы для декомпозиции update_event_inline ---

    async def _create_new_from_inline(self, data: Dict[str, Any]) -> models.Event:
        new_dt = parse_date_input(str(data.get("date", ""))) or datetime.now()
        if isinstance(new_dt, date) and not isinstance(new_dt, datetime):
            new_dt = datetime.combine(new_dt, datetime.min.time())
        
        new_rec_rule = data.get("recurrence_rule")
        is_recurring = new_rec_rule not in (None, "none", "")
        
        event = models.Event(
            title=data.get("title", "New Event"),
            date=new_dt,
            color=data.get("color"),
            important=bool(data.get("important", False)),
            done=bool(data.get("done", False)),
            recurrence_id=str(uuid.uuid4())[:8] if is_recurring else None,
            recurrence_rule=new_rec_rule,
            recurrence_end=date.fromisoformat(data["recurrence_end"]) if data.get("recurrence_end") else None
        )
        self.db.add(event)
        await self.db.flush()
        return event

    async def _process_inline_update(self, event: models.Event, data: Dict[str, Any]):
        mode = data.get("edit_mode", "only")
        rec_id = data.get("recurrence_id")
        
        if rec_id and mode == "all":
            await self._update_all_in_series(rec_id, data)
        elif rec_id and mode == "this_and_future":
            await self._update_this_and_future(event, data)
        elif rec_id and mode == "only":
            await self._update_only_one(event, data)
        else:
            await self._update_single_event(event, data)

    async def _update_single_event(self, event: models.Event, data: Dict[str, Any]):
        if "title" in data: event.title = str(data["title"])
        if "date" in data and data["date"]:
            event.date = parse_date_input(str(data["date"]))
        if "color" in data: event.color = data["color"]
        if "important" in data: event.important = bool(data["important"])
        if "done" in data: event.done = bool(data["done"])
        if "recurrence_rule" in data: 
            rule = data["recurrence_rule"]
            if rule in (None, "none", ""):
                event.recurrence_rule = None
                event.recurrence_id = None
            else:
                event.recurrence_rule = rule
                if not event.recurrence_id:
                    event.recurrence_id = str(uuid.uuid4())[:8]
        if "recurrence_end" in data and data["recurrence_end"]:
            event.recurrence_end = date.fromisoformat(data["recurrence_end"])
        elif "recurrence_rule" in data and data["recurrence_rule"] in (None, "none", ""):
            event.recurrence_end = None

    async def _update_all_in_series(self, rec_id: str, data: Dict[str, Any]):
        res = await self.db.execute(select(models.Event).where(models.Event.recurrence_id == rec_id))
        for e in res.scalars().all():
            await self._update_single_event(e, data)

    async def _update_this_and_future(self, event: models.Event, data: Dict[str, Any]):
        orig_date_str = data.get("original_date")
        orig_date = date.fromisoformat(orig_date_str.split('T')[0]) if orig_date_str else (event.date.date() if isinstance(event.date, datetime) else event.date)
        
        stmt = select(models.Event).where(models.Event.recurrence_id == event.recurrence_id, models.Event.recurrence_rule.isnot(None))
        tmpl = (await self.db.execute(stmt)).scalar_one_or_none()
        if tmpl:
            tmpl_date = tmpl.date.date() if isinstance(tmpl.date, datetime) else tmpl.date
            if orig_date <= tmpl_date:
                await self._update_all_in_series(event.recurrence_id, data)
                return
            old_tmpl_end = tmpl.recurrence_end
            tmpl.recurrence_end = orig_date - timedelta(days=1)
        else:
            old_tmpl_end = None
        
        new_rule = data.get("recurrence_rule")
        if new_rule is None and tmpl: new_rule = tmpl.recurrence_rule
        is_new_rec = new_rule not in (None, "none", "")

        new_tmpl = models.Event(
            title=str(data.get("title", event.title)),
            date=parse_date_input(str(data.get("date"))) or event.date,
            color=data.get("color") or event.color,
            important=bool(data.get("important", event.important)),
            done=False,
            recurrence_id=str(uuid.uuid4())[:8] if is_new_rec else None,
            recurrence_rule=new_rule if is_new_rec else None,
            recurrence_end=date.fromisoformat(data["recurrence_end"]) if is_new_rec and data.get("recurrence_end") else (old_tmpl_end if is_new_rec else None)
        )
        self.db.add(new_tmpl)
        
        await self.db.execute(delete(models.Event).where(
            models.Event.recurrence_id == event.recurrence_id,
            models.Event.date >= datetime.combine(orig_date, datetime.min.time()),
            models.Event.recurrence_rule.is_(None)
        ))

    async def _update_only_one(self, event: models.Event, data: Dict[str, Any]):
        orig_date_str = data.get("original_date")
        orig_date = date.fromisoformat(orig_date_str.split('T')[0]) if orig_date_str else (event.date.date() if isinstance(event.date, datetime) else event.date)
        
        self.db.add(models.RecurrenceException(recurrence_id=event.recurrence_id, exception_date=orig_date))
        
        if event.recurrence_rule is None:
            if "title" in data: event.title = str(data["title"])
            if data.get("date"): event.date = parse_date_input(str(data["date"]))
            if "color" in data: event.color = data["color"]
            if "important" in data: event.important = bool(data["important"])
            if "done" in data: event.done = bool(data["done"])
            event.recurrence_id = None
        else:
            new_dt = parse_date_input(str(data.get("date"))) or (datetime.combine(orig_date, datetime.min.time()) if isinstance(event.date, datetime) else orig_date)
            new_event = models.Event(
                title=str(data.get("title", event.title)),
                date=new_dt,
                color=data.get("color") or event.color,
                important=bool(data.get("important", event.important)),
                done=bool(data.get("done", event.done)),
                recurrence_id=None,
                recurrence_rule=None,
                recurrence_end=None
            )
            self.db.add(new_event)

    async def _process_inline_stickers(self, event: models.Event, stickers_data: List[Dict], rec_id: Optional[str]):
        if not stickers_data: return
        from .sticky_note_service import StickyNoteService
        sns = StickyNoteService(self.db)
        for s in stickers_data:
            await sns.create_note({
                **s, 
                "event_id": event.id, 
                "recurrence_id": rec_id if s.get("apply_series") else None
            })
