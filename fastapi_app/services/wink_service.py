from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from .. import models

class WinkService:
    """Сервис для работы с мигалками (Winks)."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_wink(self, text: str, dt: datetime) -> int:
        """Добавляет новую 'мигалку' (Wink)."""
        obj = models.Wink(title=text, date=dt)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj.id
