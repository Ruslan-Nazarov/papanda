from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Date, DateTime, Boolean, Integer
from datetime import datetime, date, timezone
from ..database import Base

class Event(Base):
    __tablename__ = 'event'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    date: Mapped[datetime] = mapped_column(DateTime, index=True)
    important: Mapped[bool] = mapped_column(Boolean, default=False)
    done: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    recurrence_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    recurrence_rule: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recurrence_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)

    def __repr__(self):
        return f'<Event {self.title}>'

class Chronology(Base):
    __tablename__ = 'chronology'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(10000))
    date: Mapped[datetime] = mapped_column(DateTime, index=True)
