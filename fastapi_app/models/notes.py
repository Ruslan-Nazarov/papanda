from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey
from datetime import datetime, timezone
from ..database import Base

class Notes(Base):
    """
    Модель обычной текстовой заметки.
    """
    __tablename__ = 'notes'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(100))
    note: Mapped[str] = mapped_column(Text)
    is_pinned: Mapped[bool] = mapped_column(default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Explicit relationship
    stickers = relationship("StickyNote", back_populates="note", cascade="all, delete-orphan")

class NoteCategory(Base):
    """
    Модель категории для заметок.
    """
    __tablename__ = 'note_category'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)

class StickyNote(Base):
    """
    Модель стикера (Sticky Note), который может быть привязан к событию.
    """
    __tablename__ = 'sticky_notes'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    text: Mapped[str] = mapped_column(Text) # Use Text for consistency
    color: Mapped[str] = mapped_column(String(20), default="#fff9c4")
    type: Mapped[str] = mapped_column(String(20), default="text")
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    event_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("event.id"), nullable=True)
    recurrence_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    task_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("task.id"), nullable=True)
    habit_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("habits.id"), nullable=True)
    note_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("notes.id"), nullable=True)
    dialectics_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("dialectics.id"), nullable=True)
    dialectics_block_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    event = relationship("Event", backref="stickers", lazy="select", viewonly=True, foreign_keys=[event_id])
    task = relationship("Task", backref="stickers", lazy="select", viewonly=True, foreign_keys=[task_id])
    habit = relationship("Habit", backref="stickers", lazy="select", viewonly=True, foreign_keys=[habit_id])
    note = relationship("Notes", back_populates="stickers", viewonly=False, foreign_keys=[note_id])
    dialectics = relationship("Dialectics", backref="stickers", lazy="select", viewonly=True, foreign_keys=[dialectics_id])
