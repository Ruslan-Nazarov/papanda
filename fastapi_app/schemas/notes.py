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
    title: str = Field(default='', max_length=150)
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

class BlockContent(BaseModel):
    schema_version: Literal[1] = 1
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), pattern=r"^[A-Za-z0-9_-]{1,128}$")
    side: Literal["left", "right", "center"]
    html: str = ""
    title: Optional[str] = None
    role: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[Literal["none", "in_progress", "ready"]] = "none"
    collapsed: Optional[bool] = False
    color: Optional[str] = None
    border_color: Optional[str] = None
    is_pinned: Optional[bool] = False
    sources: Optional[List[Source]] = []
    words: Optional[List[Word]] = []
    tabs: Optional[Any] = None
    active_tab_id: Optional[str] = None
    
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
    title: str = Field(max_length=150)
    blocks: List[NoteBlock]
    stickers: List[NoteSticker] = Field(default_factory=list, max_length=1000)
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
    title: Optional[str] = Field(default=None, max_length=150)
    blocks: Optional[List[NoteBlock]] = None
    stickers: Optional[List[NoteSticker]] = Field(default=None, max_length=1000)
    is_pinned: Optional[bool] = None
    is_example: Optional[bool] = None
    category_id: Optional[int] = Field(default=None, gt=0)
    status: Optional[Literal["none", "in_progress", "ready"]] = None
    sticker_text: Optional[str] = Field(default=None, max_length=500)
    sticker_color: Optional[str] = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def validate_explicit_nulls(self):
        for field in ('title', 'blocks', 'stickers', 'is_pinned', 'is_example', 'status', 'sticker_color'):
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
    schema_version: Literal[1] = 1
    content_json: List[Dict[str, Any]]

class NoteView(BaseModel):
    id: int
    schema_version: Literal[1] = 1
    revision: int
    title: str
    content_json: List[BlockContent]
    stickers: List[NoteSticker] = Field(default_factory=list)
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
    content_json: List[BlockContent]
    stickers: List[NoteSticker] = Field(default_factory=list)
    is_manual: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", check_fields=False)
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
