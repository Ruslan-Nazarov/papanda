from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any

class DialecticsSource(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None
    quote: Optional[str] = None

class DialecticsWord(BaseModel):
    word: str
    definition: str
    connections: Optional[str] = ""

class DialecticsBlock(BaseModel):
    """Блок содержимого 'Диалектики'."""
    model_config = ConfigDict(extra="allow")
    id: Optional[str] = None
    side: str
    html: str
    role: Optional[str] = None
    sources: Optional[List[DialecticsSource]] = []
    title: Optional[str] = None
    collapsed: Optional[bool] = False
    words: Optional[List[DialecticsWord]] = []
    color: Optional[str] = None
    tabs: Optional[List[Any]] = None
    active_tab_id: Optional[str] = None
    status: Optional[str] = "none"

class DialecticsCreate(BaseModel):
    """Схема для создания 'Диалектики'."""
    title: str
    blocks: List[DialecticsBlock]
    is_pinned: bool = False
    category_id: Optional[int] = None
    status: Optional[str] = "none"
    
    # Sticker data (optional)
    sticker_text: Optional[str] = None
    sticker_title: Optional[str] = None
    sticker_color: Optional[str] = "#fff9c4"
    sticker_type: Optional[str] = "text"

class DialecticsUpdate(BaseModel):
    """Схема для обновления 'Диалектики'."""
    id: int
    title: Optional[str] = None
    blocks: Optional[List[DialecticsBlock]] = None
    is_pinned: Optional[bool] = None
    category_id: Optional[int] = None
    status: Optional[str] = None
    
    # Sticker data (optional)
    sticker_text: Optional[str] = None
    sticker_title: Optional[str] = None
    sticker_color: Optional[str] = "#fff9c4"
    sticker_type: Optional[str] = "text"


class CategoryCreate(BaseModel):
    name: str
    color: Optional[str] = None

class DialecticsCategoryBase(BaseModel):
    id: int
    name: str
    color: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class DialecticsView(BaseModel):
    """Схема для отображения 'Диалектики'."""
    id: int
    title: str
    content_json: Any
    is_pinned: bool
    status: str = "none"
    is_deleted: Optional[bool] = False
    deleted_at: Optional[datetime] = None
    category_id: Optional[int] = None
    category: Optional[DialecticsCategoryBase] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)



class DialecticsGuideResponse(BaseModel):
    """Схема ответа для руководства по диалектике."""
    html: str

class DialecticsIdResponse(BaseModel):
    """Схема ответа с ID 'Диалектики'."""
    id: int

class DialecticsVersionView(BaseModel):
    id: int
    dialectics_id: int
    title: str
    content_json: Any
    is_manual: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DialecticsVersionCreate(BaseModel):
    title: Optional[str] = "Ручное сохранение"
    is_manual: Optional[bool] = True
