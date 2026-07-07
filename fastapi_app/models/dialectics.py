from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, DateTime, JSON, ForeignKey, Boolean
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
    status: Mapped[str] = mapped_column(String(20), default="none", index=True)
    is_deleted: Mapped[bool] = mapped_column(default=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    category = relationship("DialecticsCategory", lazy="selectin")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

class DialecticsVersion(Base):
    """
    Модель снимка (версии) конспекта 'Диалектики'.
    """
    __tablename__ = "dialectics_versions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    dialectics_id: Mapped[int] = mapped_column(ForeignKey("dialectics.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String, default="Автосохранение")
    content_json: Mapped[list | dict] = mapped_column(JSON, default=list)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
