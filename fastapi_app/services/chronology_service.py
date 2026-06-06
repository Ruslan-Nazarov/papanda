from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from .. import models
from ..logger import logger

class ChronologyService:
    """Сервис для работы с хронологией (Chronology)."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_chronology(self, text: str, dt: datetime) -> Optional[int]:
        """Сохраняет новую запись хронологии."""
        try:
            chrono = models.Chronology(title=text, date=dt)
            self.db.add(chrono)
            await self.db.commit()
            await self.db.refresh(chrono)
            return chrono.id
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in add_chronology: {e}", exc_info=True)
            raise

    async def update_chronology(self, chrono_id: int, text: str, dt: datetime) -> bool:
        """Обновляет существующую запись хронологии."""
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
            logger.error(f"Error in update_chronology: {e}", exc_info=True)
            raise
