# NOTE: schemas defined here are currently unused - kept for future API use
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, date
from typing import Optional, List, Any

# --- ОБЩИЕ СХЕМЫ ---

class SuccessResponse(BaseModel):
    status: str = "success"
    message: Optional[str] = None

# --- AUTH ---

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    confirm_password: str

class UserLogin(UserBase):
    password: str
    remember_me: bool = False

# --- NOTES (Заметки) ---

class NoteBase(BaseModel):
    category: Optional[str] = Field(None, max_length=50)
    note: str = Field(..., min_length=1, max_length=10000)

class NoteCreate(NoteBase):
    pass

class NoteView(NoteBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- TASKS (Задачи) ---

class TaskBase(BaseModel):
    name: str = Field(..., max_length=255)

class TaskCreate(TaskBase):
    pass

class TaskView(TaskBase):
    id: int
    done: bool
    model_config = ConfigDict(from_attributes=True)

# --- EVENTS (События) ---

class EventBase(BaseModel):
    title: str = Field(..., max_length=255)
    date: datetime
    important: bool = False

class EventCreate(EventBase):
    pass

class EventView(EventBase):
    id: int
    done: bool
    model_config = ConfigDict(from_attributes=True)

# --- HABITS (Привычки) ---

class HabitBase(BaseModel):
    title: str = Field(..., max_length=255)
    start_date: date
    end_date: Optional[date] = None

class HabitCreate(HabitBase):
    pass

class HabitView(HabitBase):
    id: int
    read: bool
    model_config = ConfigDict(from_attributes=True)

# --- CHRONOLOGY (Хронология) ---

class ChronoCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    date: datetime

class ChronoView(ChronoCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- WORDS (Слова) ---

class WordBase(BaseModel):
    eng: str
    ru: str
    it: Optional[str] = None
    de: Optional[str] = None
    meaning: Optional[str] = None

class WordView(WordBase):
    count: int
    is_known_en: bool
    is_known_it: bool
    is_known_de: bool
    last_shown: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class WordUpdate(BaseModel):
    word_eng: str
    new_ru: str
    new_meaning: str = ""

# --- DASHBOARD ---

class DashboardItem(BaseModel):
    key: str
    title: str
    date: datetime
    model_config = ConfigDict(from_attributes=True)

# --- SETTINGS ---

class AppSettingBase(BaseModel):
    key: str
    value: str
    model_config = ConfigDict(from_attributes=True)

# --- STICKY NOTES ---

class StickyNoteBase(BaseModel):
    title: Optional[str] = None
    text: str
    color: str = "#fff9c4"
    type: str = "text"

class StickyNoteCreate(StickyNoteBase):
    pass

class StickyNoteView(StickyNoteBase):
    id: int
    position: int
    created_at: datetime
    finished_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- OBSERVATIONS ---

class ObservationBase(BaseModel):
    text: str
    priority: int = 1
    is_main: bool = False
    status: str = "periodic"
    end_time: Optional[str] = None
    no_time: bool = False

class ObservationCreate(ObservationBase):
    pass

class ObservationView(ObservationBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ObservationLogView(BaseModel):
    id: int
    observation_id: int
    done_at: datetime
    model_config = ConfigDict(from_attributes=True)
