from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from .. import models
from ..logger import logger
from ..utils import attach_stickers_count

class TaskService:
    """Сервис для работы с задачами (Tasks)."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_task(self, text: str) -> int:
        """Добавляет новую задачу."""
        obj = models.Task(name=text, done=False)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj.id

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

    async def get_active_tasks(self) -> List[models.Task]:
        """Возвращает список невыполненных задач с количеством стикеров."""
        res = await self.db.execute(
            select(models.Task)
            .where(models.Task.done == False)
            .order_by(models.Task.position, models.Task.created_at.desc())
        )
        tasks = list(res.scalars().all())
        await attach_stickers_count(self.db, tasks, 'task_id', models.StickyNote)
        return tasks
