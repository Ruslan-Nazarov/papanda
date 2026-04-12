from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, Integer, Text
from datetime import datetime, timezone
from ..database import Base

class Notes(Base):
    __tablename__ = 'notes'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(100))
    note: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class NoteCategory(Base):
    __tablename__ = 'note_category'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)

class StickyNote(Base):
    __tablename__ = 'sticky_notes'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    text: Mapped[str] = mapped_column(String(10000))
    color: Mapped[str] = mapped_column(String(20), default="#fff9c4")
    type: Mapped[str] = mapped_column(String(20), default="text")
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
