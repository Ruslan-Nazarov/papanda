from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any

class DialecticsBlock(BaseModel):
    """Блок содержимого 'Диалектики'."""
    id: Optional[str] = None
    side: str
    html: str
    role: Optional[str] = None

class DialecticsCreate(BaseModel):
    """Схема для создания 'Диалектики'."""
    title: str
    blocks: List[DialecticsBlock]
    is_pinned: bool = False
    
    # Sticker data (optional)
    sticker_text: Optional[str] = None
    sticker_title: Optional[str] = None
    sticker_color: Optional[str] = "#fff9c4"
    sticker_type: Optional[str] = "text"

class DialecticsUpdate(BaseModel):
    """Схема для обновления 'Диалектики'."""
    id: int
    title: str
    blocks: List[DialecticsBlock]
    is_pinned: Optional[bool] = None
    
    # Sticker data (optional)
    sticker_text: Optional[str] = None
    sticker_title: Optional[str] = None
    sticker_color: Optional[str] = "#fff9c4"
    sticker_type: Optional[str] = "text"

class DialecticsView(BaseModel):
    """Схема для отображения 'Диалектики'."""
    id: int
    title: str
    content_json: Any
    is_pinned: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class DialecticsGuideResponse(BaseModel):
    """Схема ответа для руководства по диалектике."""
    html: str

class DialecticsIdResponse(BaseModel):
    """Схема ответа с ID 'Диалектики'."""
    id: int
