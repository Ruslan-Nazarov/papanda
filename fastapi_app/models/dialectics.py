from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from datetime import datetime
from ..database import Base

class DialecticsCategory(Base):
    """
    Модель категории для конспектов 'Диалектики'.
    """
    __tablename__ = "dialectics_category"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)

class Dialectics(Base):
    """
    Модель 'Диалектики' (ранее Smart Note) с поддержкой JSON-структуры блоков.
    """
    __tablename__ = "dialectics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True, default="")
    category_id: Mapped[int | None] = mapped_column(ForeignKey("dialectics_category.id", ondelete="SET NULL"), nullable=True)
    content_json: Mapped[list | dict] = mapped_column(JSON, default=list)
    is_pinned: Mapped[bool] = mapped_column(default=False)
    
    category = relationship("DialecticsCategory")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
