from typing import Any, List, Optional
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from fastapi_app.database import Base

class NoteCategory(Base):
    __tablename__ = "note_categories"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

class Note(Base):
    __tablename__ = "notes"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(150), index=True)
    content_json: Mapped[List[dict]] = mapped_column(JSON, default=list)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("note_categories.id", ondelete="SET NULL"), nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_example: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="none") # none, in_progress, ready
    sticker_text: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sticker_color: Mapped[str] = mapped_column(String(20), default="#fff9c4")
    sync_id: Mapped[Optional[str]] = mapped_column(String(36), unique=True, index=True, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    
    category: Mapped[Optional["NoteCategory"]] = relationship("NoteCategory", lazy="selectin")

class NoteVersion(Base):
    __tablename__ = "note_versions"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150), default="Автосохранение")
    content_json: Mapped[List[dict]] = mapped_column(JSON, default=list)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

class NoteConnection(Base):
    __tablename__ = "note_connections"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    note_id_from: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    note_id_to: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(100), default="related")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('note_id_from', 'note_id_to', name='_note_connection_uc'),
    )

