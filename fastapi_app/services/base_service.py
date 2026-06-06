from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Type, Any, Optional
from ..logger import logger

class BaseService:
    """Базовый сервис с общими CRUD операциями и паттернами."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def toggle_boolean(self, model_class: Type[Any], item_id: Any, field_name: str = "done") -> Optional[bool]:
        """Универсальное переключение булева поля (например, done, important)."""
        try:
            stmt = select(model_class).where(model_class.id == item_id)
            res = await self.db.execute(stmt)
            item = res.scalar_one_or_none()
            if item:
                current_val = getattr(item, field_name)
                new_val = not current_val
                setattr(item, field_name, new_val)
                await self.db.commit()
                return new_val
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"[BaseService] Error toggling {field_name} for {model_class.__name__} {item_id}: {e}")
            raise

    async def update_positions(self, model_class: Type[Any], item_ids: List[int], position_field: str = "position") -> bool:
        """Универсальное обновление порядка (drag-n-drop)."""
        try:
            # Массовое обновление для производительности
            for index, item_id in enumerate(item_ids):
                stmt = update(model_class).where(model_class.id == item_id).values({position_field: index})
                await self.db.execute(stmt)
            
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"[BaseService] Error updating positions for {model_class.__name__}: {e}")
            return False

    async def delete_by_id(self, model_class: Type[Any], item_id: Any) -> bool:
        """Базовое удаление записи по ID."""
        try:
            stmt = select(model_class).where(model_class.id == item_id)
            res = await self.db.execute(stmt)
            item = res.scalar_one_or_none()
            if item:
                await self.db.delete(item)
                await self.db.commit()
                return True
            return False
        except Exception as e:
            await self.db.rollback()
            logger.error(f"[BaseService] Error deleting {model_class.__name__} {item_id}: {e}")
            return False
