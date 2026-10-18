from pydantic import BaseModel, ConfigDict, field_serializer, field_validator, model_validator, Field
from typing import List, Optional, Literal, Any, Dict
from datetime import datetime, timezone
import uuid

Status = Literal["none", "in_progress", "ready"]
from fastapi_app.services.sanitizer import sanitize_on_write

def _serialize_utc(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, max_length=20)

    @model_validator(mode='after')
    def nonnull_name(self):
        if 'name' in self.model_fields_set and self.name is None:
            raise ValueError('name cannot be null')
        return self

class NoteSticker(BaseModel):
    id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,128}$')
    title: str = Field(default='', max_length=500)
    text: str = Field(max_length=10000)
    color: str = Field(default='#fef9c3', pattern=r'^#[0-9a-fA-F]{6}$')
    created_at: Optional[datetime] = None

    @field_serializer('created_at')
    def serialize_created_at(self, value):
        return _serialize_utc(value)

class CategoryView(CategoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Source(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None
    quote: Optional[str] = None

class Word(BaseModel):
    word: str
    definition: str
    connections: Optional[str] = None
    connection_explanations: Dict[str, str] = Field(default_factory=dict)

class MathSymbol(BaseModel):
    symbol: str = Field(min_length=1, max_length=300)
    definition: str = Field(min_length=1, max_length=5000)

    @field_validator('symbol', 'definition')
    @classmethod
    def nonblank(cls, value):
        if not value.strip() or '\x00' in value:
            raise ValueError('Symbol and definition must contain readable text')
        return value.strip()

class MathNumberDefinition(BaseModel):
    formula: str = Field(min_length=1, max_length=20_000)
    start: int = Field(ge=0)
    end: int = Field(ge=1)
    value: str = Field(min_length=1, max_length=1000)
    definition: str = Field(min_length=1, max_length=5000)

    @model_validator(mode='after')
    def valid_occurrence(self):
        if not 0 <= self.start < self.end <= len(self.formula) or self.formula[self.start:self.end] != self.value:
            raise ValueError('The number must match its position in the formula')
        if not self.definition.strip() or '\x00' in self.definition:
            raise ValueError('Definition must contain readable text')
        self.definition = self.definition.strip()
        return self


class RequestDocument(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    text: str = Field(min_length=1, max_length=50_000)

    @field_validator('text')
    @classmethod
    def readable_text(cls, value):
        if not value.strip() or '\x00' in value:
            raise ValueError('Document must contain readable text')
        return value

class AttachedConspect(RequestDocument):
    id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,128}$')

class IncludedConspect(BaseModel):
    note_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=255)

class RejectedDraft(BaseModel):
    id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,128}$')
    html: str = Field(max_length=3_000_000)
    reason: str = Field(default='', max_length=2000)
    created_at: datetime

    @field_validator('html')
    @classmethod
    def sanitize_html(cls, value):
        return sanitize_on_write(value, reject_invalid_images=True)

    @field_serializer('created_at')
    def serialize_created_at(self, value):
        return _serialize_utc(value)


class BlockDerivation(BaseModel):
    source_id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,128}$')
    html: str = Field(max_length=3_000_000)

    @field_validator('html')
    @classmethod
    def sanitize_html(cls, value):
        return sanitize_on_write(value, reject_invalid_images=True)


class BlockContent(BaseModel):
    schema_version: Literal[1] = 1
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), pattern=r"^[A-Za-z0-9_-]{1,128}$")
    side: Literal["left", "right", "center"]
    html: str = ""
    title: Optional[str] = None
    role: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[Literal["none", "in_progress", "ready"]] = "none"
    author: Optional[Literal["ai", "ai_checked", "ai_edited", "human"]] = None
    collapsed: Optional[bool] = False
    color: Optional[str] = None
    border_color: Optional[str] = None
    is_pinned: Optional[bool] = False
    sources: Optional[List[Source]] = []
    words: Optional[List[Word]] = []
    tabs: Optional[Any] = None
    active_tab_id: Optional[str] = None
    request_document: Optional[RequestDocument] = None
    attached_conspects: List[AttachedConspect] = Field(default_factory=list, max_length=20)
    included_conspects: List[IncludedConspect] = Field(default_factory=list, max_length=20)
    rejected_drafts: List[RejectedDraft] = Field(default_factory=list, max_length=100)
    derivations: List[BlockDerivation] = Field(default_factory=list, max_length=1000)
    math_symbols: List[MathSymbol] = Field(default_factory=list, max_length=1000)
    math_number_definitions: List[MathNumberDefinition] = Field(default_factory=list, max_length=1000)
    
    model_config = ConfigDict(extra="allow")

    @field_validator("status", mode="before")
    @classmethod
    def normalize_legacy_status(cls, value):
        return "in_progress" if value == "draft" else value

class NoteBlock(BlockContent):
    @field_validator("html")
    @classmethod
    def sanitize_editor_html(cls, value):
        # Validation errors become HTTP 422 before any database changes.
        return sanitize_on_write(value, reject_invalid_images=True)

class NoteCreate(BaseModel):
    schema_version: Literal[1] = 1
    title: str
    note_notice: str = Field(default='', max_length=5000)
    blocks: List[NoteBlock]
    stickers: List[NoteSticker] = Field(default_factory=list, max_length=1000)
    dictionary: List[Word] = Field(default_factory=list, max_length=1000)
    math_symbols: List[MathSymbol] = Field(default_factory=list, max_length=1000)
    is_pinned: bool = False
    is_example: bool = False
    category_id: Optional[int] = Field(default=None, gt=0)
    status: Status = "none"
    sticker_text: Optional[str] = Field(default=None, max_length=500)
    sticker_color: str = Field(default="#fff9c4", max_length=20)

    @field_validator('blocks', check_fields=False)
    @classmethod
    def unique_block_ids(cls, blocks):
        if blocks is not None and len({b.id for b in blocks}) != len(blocks):
            raise ValueError('Block IDs must be unique within a note')
        return blocks

class NoteUpdate(BaseModel):
    schema_version: Literal[1] = 1
    revision: int = Field(ge=1)
    title: Optional[str] = None
    note_notice: Optional[str] = Field(default=None, max_length=5000)
    blocks: Optional[List[NoteBlock]] = None
    stickers: Optional[List[NoteSticker]] = Field(default=None, max_length=1000)
    dictionary: Optional[List[Word]] = Field(default=None, max_length=1000)
    math_symbols: Optional[List[MathSymbol]] = Field(default=None, max_length=1000)
    is_pinned: Optional[bool] = None
    is_example: Optional[bool] = None
    category_id: Optional[int] = Field(default=None, gt=0)
    status: Optional[Literal["none", "in_progress", "ready"]] = None
    sticker_text: Optional[str] = Field(default=None, max_length=500)
    sticker_color: Optional[str] = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def validate_explicit_nulls(self):
        for field in ('title', 'note_notice', 'blocks', 'stickers', 'dictionary', 'math_symbols', 'is_pinned', 'is_example', 'status', 'sticker_color'):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f'{field} cannot be null')
        return self

    @field_validator('blocks', check_fields=False)
    @classmethod
    def unique_block_ids(cls, blocks):
        if blocks is not None and len({b.id for b in blocks}) != len(blocks):
            raise ValueError('Block IDs must be unique within a note')
        return blocks

class RevisionRequest(BaseModel):
    revision: int = Field(ge=1)

class PublicNoteView(BaseModel):
    title: str
    note_notice: str = ''
    math_symbols: List[MathSymbol] = Field(default_factory=list)
    schema_version: Literal[1] = 1
    content_json: List[Dict[str, Any]]

class NoteView(BaseModel):
    id: int
    schema_version: Literal[1] = 1
    revision: int
    title: str
    library_slug: Optional[str] = None
    language: str = 'ru'
    available_languages: List[str] = Field(default_factory=list)
    note_notice: str = ''
    content_json: List[BlockContent]
    stickers: List[NoteSticker] = Field(default_factory=list)
    dictionary: List[Word] = Field(default_factory=list)
    math_symbols: List[MathSymbol] = Field(default_factory=list)
    category_id: Optional[int]
    is_pinned: bool
    is_example: bool
    status: str
    is_deleted: bool
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: Optional[CategoryView] = None
    sticker_text: Optional[str] = None
    sticker_color: Optional[str] = None
    sync_id: Optional[str] = None
    share_token: Optional[str] = None
    family_id: Optional[int] = None
    parent_note_id: Optional[int] = None
    variant_label: Optional[str] = None
    variant_origin: str = 'human'
    fork_step: Optional[int] = None
    long_term_goal: bool = False

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at", "deleted_at", check_fields=False)
    def serialize_dates(self, dt: Optional[datetime]) -> Optional[str]:
        return _serialize_utc(dt)

class NoteVersionCreate(BaseModel):
    title: str = Field(max_length=150)
    is_manual: bool = True

class NoteVersionView(BaseModel):
    id: int
    note_id: int
    title: str
    note_notice: str = ''
    content_json: List[BlockContent]
    stickers: List[NoteSticker] = Field(default_factory=list)
    dictionary: List[Word] = Field(default_factory=list)
    math_symbols: List[MathSymbol] = Field(default_factory=list)
    is_manual: bool
    material_token: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", check_fields=False)
    def serialize_created_at(self, dt: Optional[datetime]) -> Optional[str]:
        return _serialize_utc(dt)

class NoteMaterialView(BaseModel):
    id: int
    title: str
    material_token: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: Optional[datetime]) -> Optional[str]:
        return _serialize_utc(dt)

class ConnectionCreate(BaseModel):
    note_id_to: int = Field(gt=0)
    label: str = Field(default="related", max_length=100)

class ConnectionView(BaseModel):
    id: int
    note_id_from: int
    note_id_to: int
    label: str
    created_at: datetime
    target_title: str
    target_category: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", check_fields=False)
    def serialize_created_at(self, dt: Optional[datetime]) -> Optional[str]:
        return _serialize_utc(dt)
