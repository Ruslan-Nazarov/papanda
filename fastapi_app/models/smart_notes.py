from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, DateTime
from sqlalchemy.sql import func
from datetime import datetime
from ..database import Base

class SmartNote(Base):
    """
    Модель 'умной заметки' с поддержкой JSON-структуры блоков.
    """
    __tablename__ = "smart_notes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True, default="Untitled Note")
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    content_json: Mapped[str] = mapped_column(Text, default="[]")
    is_pinned: Mapped[bool] = mapped_column(default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
