from pydantic import BaseModel, Field, ConfigDict

class TaskBase(BaseModel):
    """Базовая схема задачи."""
    name: str = Field(..., max_length=255)

class TaskCreate(TaskBase):
    """Схема для создания задачи."""
    pass

class TaskView(TaskBase):
    """Схема для отображения задачи."""
    id: int
    done: bool
    model_config = ConfigDict(from_attributes=True)
