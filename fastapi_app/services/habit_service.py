from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
from typing import List
from .. import models
from ..logger import logger
from ..utils import attach_stickers_count

class HabitService:
    """Сервис для работы с привычками (Habits)."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_habit(self, text: str, start_date: date) -> int:
        """Добавляет новую привычку."""
        obj = models.Habit(title=text, start_date=start_date, read=False)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj.id

    async def mark_habit_done(self, habit_id: int) -> bool:
        """Помечает привычку как выполненную (архивирует её)."""
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

    async def get_active_habits(self) -> List[models.Habit]:
        """Возвращает список активных привычек с количеством стикеров."""
        res = await self.db.execute(select(models.Habit).where(models.Habit.read == False))
        habits = list(res.scalars().all())
        await attach_stickers_count(self.db, habits, 'habit_id', models.StickyNote)
        return habits
