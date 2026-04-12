from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Date, DateTime, Boolean, Integer
from datetime import datetime, date, timezone
from ..database import Base

class Task(Base):
    __tablename__ = 'task'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    done: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)

class Habit(Base):
    __tablename__ = 'habits'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    start_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

class HabitsDone(Base):
    __tablename__ = 'habits_done'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    countdays: Mapped[int] = mapped_column(Integer)
