from typing import List, Optional
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint, Integer, event
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from sqlalchemy.sql import func
from fastapi_app.database import Base


def localized_field(name):
    """One note identity with language-specific text, using the normal editor services."""
    def get_value(note):
        document = (note.translations or {}).get(getattr(note, '_active_locale', 'ru'), {})
        return document[name] if name in document else getattr(note, '_' + name)

    def set_value(note, value):
        locale = getattr(note, '_active_locale', 'ru')
        if locale != 'ru' and locale in (note.translations or {}):
            note.translations = {**note.translations, locale: {**note.translations[locale], name: value}}
        else:
            setattr(note, '_' + name, value)
    return property(get_value, set_value)

class NoteCategory(Base):
    __tablename__ = "note_categories"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

class NoteFamily(Base):
    __tablename__ = "note_families"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Note(Base):
    __tablename__ = "notes"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    schema_version: Mapped[int] = mapped_column(default=1, server_default='1')
    revision: Mapped[int] = mapped_column(default=1, server_default='1')
    __mapper_args__ = {'version_id_col': revision}
    _title: Mapped[str] = mapped_column('title', String(150), index=True)
    _note_notice: Mapped[str] = mapped_column('note_notice', String(5000), default='', server_default='')
    _content_json: Mapped[List[dict]] = mapped_column('content_json', JSON, default=list)
    _stickers: Mapped[List[dict]] = mapped_column('stickers', JSON, default=list, server_default='[]')
    _dictionary: Mapped[List[dict]] = mapped_column('dictionary', JSON, default=list, server_default='[]')
    _dictionary_tags: Mapped[List[dict]] = mapped_column('dictionary_tags', JSON, default=list, server_default='[]')
    _math_symbols: Mapped[List[dict]] = mapped_column('math_symbols', JSON, default=list, server_default='[]')
    title = synonym('_title', descriptor=localized_field('title'))
    note_notice = synonym('_note_notice', descriptor=localized_field('note_notice'))
    content_json = synonym('_content_json', descriptor=localized_field('content_json'))
    stickers = synonym('_stickers', descriptor=localized_field('stickers'))
    dictionary = synonym('_dictionary', descriptor=localized_field('dictionary'))
    dictionary_tags = synonym('_dictionary_tags', descriptor=localized_field('dictionary_tags'))
    math_symbols = synonym('_math_symbols', descriptor=localized_field('math_symbols'))
    translations: Mapped[dict] = mapped_column(JSON, default=dict, server_default='{}')
    library_slug: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    def use_locale(self, locale):
        self._active_locale = locale if locale in (self.translations or {}) else 'ru'
        return self

    @property
    def language(self):
        return getattr(self, '_active_locale', 'ru')

    @property
    def available_languages(self):
        return ['ru', *(self.translations or {}).keys()] if self.library_slug else []
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("note_categories.id", ondelete="SET NULL"), nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_example: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="none") # none, in_progress, ready
    sticker_text: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sticker_color: Mapped[str] = mapped_column(String(20), default="#fff9c4")
    sync_id: Mapped[Optional[str]] = mapped_column(String(36), unique=True, index=True, nullable=True)
    family_id: Mapped[Optional[int]] = mapped_column(ForeignKey("note_families.id", ondelete="SET NULL"), nullable=True, index=True)
    parent_note_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notes.id", ondelete="SET NULL"), nullable=True)
    variant_label: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    variant_origin: Mapped[str] = mapped_column(String(20), default="human", server_default="human")
    fork_step: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    long_term_goal: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    # Публичная ссылка на конспект (только чтение). None = не расшарен.
    share_token: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    
    category: Mapped[Optional["NoteCategory"]] = relationship("NoteCategory", lazy="selectin")

@event.listens_for(Note, 'load')
def select_note_language(note, context):
    note.use_locale(context.session.info.get('locale', 'ru'))


class NoteVersion(Base):
    __tablename__ = "note_versions"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150), default="Автосохранение")
    note_notice: Mapped[str] = mapped_column(String(5000), default='', server_default='')
    content_json: Mapped[List[dict]] = mapped_column(JSON, default=list)
    stickers: Mapped[List[dict]] = mapped_column(JSON, default=list, server_default='[]')
    dictionary: Mapped[List[dict]] = mapped_column(JSON, default=list, server_default='[]')
    dictionary_tags: Mapped[List[dict]] = mapped_column(JSON, default=list, server_default='[]')
    math_symbols: Mapped[List[dict]] = mapped_column(JSON, default=list, server_default='[]')
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False)
    material_token: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)
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

class NoteActivity(Base):
    __tablename__ = "note_activity"

    id: Mapped[int] = mapped_column(primary_key=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32), index=True)
    data_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
