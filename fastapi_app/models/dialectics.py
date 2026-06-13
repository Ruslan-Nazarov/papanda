from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, DateTime, JSON
from sqlalchemy.sql import func
from datetime import datetime
from ..database import Base

class Dialectics(Base):
    """
    Модель 'Диалектики' (ранее Smart Note) с поддержкой JSON-структуры блоков.
    """
    __tablename__ = "dialectics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True, default="Untitled Dialectics")
    content_json: Mapped[list | dict] = mapped_column(JSON, default=list)
    is_pinned: Mapped[bool] = mapped_column(default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
