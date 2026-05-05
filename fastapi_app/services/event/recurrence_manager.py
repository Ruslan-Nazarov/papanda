from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
import uuid

from ... import models
from ...logger import logger

class RecurrenceManager:
    """Менеджер сложной логики повторений (клоны, исключения, серии)."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def handle_completion(self, event: models.Event, target_date_str: str) -> bool:
        """Обработка завершения одного экземпляра из серии."""
        target_date = date.fromisoformat(target_date_str)
        
        # Проверяем, нет ли уже физического клона на эту дату
        stmt = select(models.Event).where(
            models.Event.recurrence_id == event.recurrence_id,
            func.date(models.Event.date) == target_date
        )
        res = await self.db.execute(stmt)
        existing_clone = res.scalar_one_or_none()
        
        if existing_clone:
            existing_clone.done = True
        else:
            # Создаем физический клон-заглушку со статусом 'выполнено'
            event_time = event.date.time() if isinstance(event.date, datetime) else datetime.min.time()
            new_event = models.Event(
                title=event.title,
                date=datetime.combine(target_date, event_time),
                important=event.important,
                done=True,
                recurrence_id=event.recurrence_id,
                recurrence_rule=None, # Это клон, он не должен сам быть шаблоном
                color=event.color,
                position=event.position
            )
            self.db.add(new_event)
        
        return True

    async def handle_deletion(self, event: models.Event, mode: str, target_date: date) -> bool:
        """Обработка удаления с учетом режима (only, all, future)."""
        rec_id = event.recurrence_id
        if not rec_id:
            await self.db.delete(event)
            return True

        if mode == "only":
            # Добавляем исключение для этой даты
            self.db.add(models.RecurrenceException(recurrence_id=rec_id, exception_date=target_date))
            # Если удаляем сам физический шаблон (если дата совпадает)
            if not event.recurrence_rule and (event.date.date() if isinstance(event.date, datetime) else event.date) == target_date:
                await self.db.delete(event)
        
        elif mode == "all":
            await self.db.execute(delete(models.Event).where(models.Event.recurrence_id == rec_id))
            await self.db.execute(delete(models.RecurrenceException).where(models.RecurrenceException.recurrence_id == rec_id))
        
        elif mode == "this_and_future":
            # 1. Ограничиваем старый шаблон
            await self._limit_template(rec_id, target_date - timedelta(days=1))
            # 2. Удаляем все будущие физические экземпляры серии
            await self.db.execute(delete(models.Event).where(
                models.Event.recurrence_id == rec_id,
                models.Event.date >= datetime.combine(target_date, datetime.min.time()),
                models.Event.recurrence_rule.is_(None)
            ))
            
        elif mode == "future_only":
            await self._limit_template(rec_id, target_date)
            await self.db.execute(delete(models.Event).where(
                models.Event.recurrence_id == rec_id,
                models.Event.date > datetime.combine(target_date, datetime.max.time()),
                models.Event.recurrence_rule.is_(None)
            ))
            
        return True

    async def _limit_template(self, rec_id: str, end_date: date):
        """Вспомогательный метод для ограничения даты окончания шаблона."""
        stmt = select(models.Event).where(
            models.Event.recurrence_id == rec_id, 
            models.Event.recurrence_rule.isnot(None)
        )
        res = await self.db.execute(stmt)
        tmpl = res.scalar_one_or_none()
        if tmpl:
            tmpl.recurrence_end = end_date
