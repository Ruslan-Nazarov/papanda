from typing import Type, Callable
from sqlalchemy.ext.asyncio import AsyncSession
import traceback

class UnitOfWork:
    """
    Паттерн Unit of Work для управления транзакциями БД и репозиториями.
    Обеспечивает атомарность операций, используя инжектированную сессию.
    """
    def __init__(self, session: AsyncSession):
        self.session = session

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, traceback_):
        if exc_type is not None:
            await self.rollback()
        else:
            await self.commit()

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()
