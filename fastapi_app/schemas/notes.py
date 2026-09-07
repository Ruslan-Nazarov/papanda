from pydantic import BaseModel, ConfigDict, field_serializer
from typing import List, Optional, Literal, Any, Dict
from datetime import datetime, timezone

def _serialize_utc(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

class CategoryBase(BaseModel):
    name: str
    color: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

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

class NoteBlock(BaseModel):
    id: Optional[str] = None
    side: str # left, right, center
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

class NoteCreate(BaseModel):
    title: str
    blocks: List[NoteBlock]
    is_pinned: bool = False
    is_example: bool = False
    category_id: Optional[int] = None
    status: Optional[Literal["none", "in_progress", "ready"]] = "none"
    sticker_text: Optional[str] = None
    sticker_color: Optional[str] = "#fff9c4"

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    blocks: Optional[List[NoteBlock]] = None
    is_pinned: Optional[bool] = None
    is_example: Optional[bool] = None
    category_id: Optional[int] = None
    status: Optional[Literal["none", "in_progress", "ready"]] = None
    sticker_text: Optional[str] = None
    sticker_color: Optional[str] = None

class NoteView(BaseModel):
    id: int
    title: str
    content_json: List[Dict[str, Any]]
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
    title: str
    is_manual: bool = True

class NoteVersionView(BaseModel):
    id: int
    note_id: int
    title: str
    content_json: List[Dict[str, Any]]
    is_manual: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", check_fields=False)
    def serialize_created_at(self, dt: Optional[datetime]) -> Optional[str]:
        return _serialize_utc(dt)

class ConnectionCreate(BaseModel):
    note_id_to: int
    label: Optional[str] = "related"

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
