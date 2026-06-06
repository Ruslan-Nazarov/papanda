from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ObservationBase(BaseModel):
    """Базовая схема наблюдения."""
    text: str
    priority: int = 1
    is_main: bool = False
    status: str = "periodic"
    end_time: Optional[str] = None
    no_time: bool = False
    task_id: Optional[int] = None

class ObservationCreate(ObservationBase):
    """Схема для создания наблюдения."""
    pass

class ObservationView(ObservationBase):
    """Схема для отображения наблюдения."""
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ObservationLogView(BaseModel):
    """Запись в логе выполнения наблюдения."""
    id: int
    observation_id: int
    done_at: datetime
    model_config = ConfigDict(from_attributes=True)
