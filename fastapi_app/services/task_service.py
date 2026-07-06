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

    async def ensure_active_set(self) -> models.TaskSet:
        """Гарантирует существование активного набора задач."""
        res = await self.db.execute(select(models.TaskSet).where(models.TaskSet.is_active == True))
        active_set = res.scalar_one_or_none()
        if not active_set:
            res_any = await self.db.execute(select(models.TaskSet).order_by(models.TaskSet.id.asc()))
            first_set = res_any.scalars().first()
            if first_set:
                first_set.is_active = True
                await self.db.commit()
                return first_set
            else:
                new_set = models.TaskSet(name="Основной", is_active=True)
                self.db.add(new_set)
                await self.db.flush()
                # Привязываем существующие задачи без набора к этому набору
                res_tasks = await self.db.execute(select(models.Task).where(models.Task.set_id == None))
                for task in res_tasks.scalars().all():
                    task.set_id = new_set.id
                await self.db.commit()
                return new_set
        return active_set

    async def get_all_sets(self) -> List[models.TaskSet]:
        """Возвращает список всех наборов задач."""
        await self.ensure_active_set()
        res = await self.db.execute(select(models.TaskSet).order_by(models.TaskSet.id.asc()))
        return list(res.scalars().all())

    async def create_set(self, name: str, clone_from_active: bool = False) -> models.TaskSet:
        """Создает новый набор задач и опционально копирует элементы из активного."""
        active_set = await self.ensure_active_set()
        
        # Деактивируем текущие наборы
        res_all = await self.db.execute(select(models.TaskSet))
        for s in res_all.scalars().all():
            s.is_active = False
            
        new_set = models.TaskSet(name=name, is_active=True)
        self.db.add(new_set)
        await self.db.flush()
        
        if clone_from_active and active_set:
            res_tasks = await self.db.execute(select(models.Task).where(models.Task.set_id == active_set.id))
            for task in res_tasks.scalars().all():
                clone_task = models.Task(
                    name=task.name,
                    done=task.done,
                    position=task.position,
                    set_id=new_set.id
                )
                self.db.add(clone_task)
                
        await self.db.commit()
        return new_set

    async def activate_set(self, set_id: int) -> Optional[models.TaskSet]:
        """Делает указанный набор активным."""
        res = await self.db.execute(select(models.TaskSet).where(models.TaskSet.id == set_id))
        target_set = res.scalar_one_or_none()
        if not target_set:
            return None
            
        res_all = await self.db.execute(select(models.TaskSet))
        for s in res_all.scalars().all():
            s.is_active = (s.id == set_id)
            
        await self.db.commit()
        return target_set

    async def add_task(self, text: str) -> int:
        """Добавляет новую задачу."""
        active_set = await self.ensure_active_set()
        obj = models.Task(name=text, done=False, set_id=active_set.id)
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

    async def get_active_tasks(self, set_id: Optional[int] = None) -> List[models.Task]:
        """Возвращает список невыполненных задач с количеством стикеров."""
        if set_id is None:
            active_set = await self.ensure_active_set()
            set_id = active_set.id
        res = await self.db.execute(
            select(models.Task)
            .where(models.Task.done == False, models.Task.set_id == set_id)
            .order_by(models.Task.position, models.Task.created_at.desc())
        )
        tasks = list(res.scalars().all())
        await attach_stickers_count(self.db, tasks, 'task_id', models.StickyNote)
        return tasks
