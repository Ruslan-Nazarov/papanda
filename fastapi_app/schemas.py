from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime, date
from typing import Optional, List, Any
from fastapi import Form, Request

# --- ОБЩИЕ СХЕМЫ ---

class SuccessResponse(BaseModel):
    """Стандартный успешный ответ API."""
    status: str = "success"
    message: Optional[str] = None

# --- AUTH ---

class UserBase(BaseModel):
    """Базовая схема пользователя."""
    username: str = Field(..., min_length=3, max_length=20)

class UserCreate(UserBase):
    """Схема для создания (регистрации) пользователя."""
    password: str = Field(..., min_length=5)
    confirm_password: str

    @model_validator(mode='after')
    def check_passwords_match(self) -> 'UserCreate':
        if self.password != self.confirm_password:
            raise ValueError('Пароли не совпадают')
        return self

class UserLogin(UserBase):
    """Схема для входа пользователя."""
    password: str
    remember_me: bool = False

# --- NOTES (Заметки) ---

class NoteBase(BaseModel):
    """Базовая схема заметки."""
    category: Optional[str] = Field(None, max_length=50)
    note: str = Field(..., min_length=1, max_length=10000)

class NoteCreate(NoteBase):
    """Схема для создания заметки."""
    pass

class NoteView(NoteBase):
    """Схема для отображения заметки."""
    id: int
    is_pinned: bool = False
    created_at: datetime
    preview: Optional[str] = None
    title: Optional[str] = None
    stickers: List['StickyNoteView'] = []
    model_config = ConfigDict(from_attributes=True)

class NoteUpdate(BaseModel):
    """Схема для обновления заметки."""
    category: str
    note: str
    is_pinned: bool = False

# --- TASKS (Задачи) ---

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

# --- EVENTS (События) ---

class EventBase(BaseModel):
    """Базовая схема события."""
    title: str = Field(..., max_length=255)
    date: datetime
    important: bool = False

class EventCreate(EventBase):
    """Схема для создания события."""
    pass

class EventView(EventBase):
    """Схема для отображения события."""
    id: int
    done: bool
    model_config = ConfigDict(from_attributes=True)

# --- HABITS (Привычки) ---

class HabitBase(BaseModel):
    """Базовая схема привычки."""
    title: str = Field(..., max_length=255)
    start_date: date
    end_date: Optional[date] = None

class HabitCreate(HabitBase):
    """Схема для создания привычки."""
    pass

class HabitView(HabitBase):
    """Схема для отображения привычки."""
    id: int
    read: bool
    model_config = ConfigDict(from_attributes=True)

# --- CHRONOLOGY (Хронология) ---

class ChronoCreate(BaseModel):
    """Схема для создания записи в хронологии."""
    text: str = Field(..., min_length=1, max_length=10000)
    date: datetime

    @classmethod
    def as_form(cls, chrono_text: str = Form(...), chrono_date: str = Form(...)):
        from .utils import parse_date_input
        dt = parse_date_input(chrono_date)
        if isinstance(dt, date) and not isinstance(dt, datetime):
            dt = datetime.combine(dt, datetime.min.time())
        return cls(text=chrono_text, date=dt)

class ChronoView(ChronoCreate):
    """Схема для отображения записи в хронологии."""
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- WORDS (Слова) ---

class WordBase(BaseModel):
    """Базовая схема слова."""
    eng: str
    ru: str
    it: Optional[str] = None
    de: Optional[str] = None
    meaning: Optional[str] = None

class WordView(WordBase):
    """Схема для отображения слова."""
    count: int
    is_known_en: bool
    is_known_it: bool
    is_known_de: bool
    last_shown: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class WordUpdateSchema(BaseModel):
    """Схема для обновления слова."""
    word_eng: str
    new_ru: str
    new_meaning: str = ""
    model_config = ConfigDict(extra='allow')

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        return cls(**dict(form_data))

class MarkKnownRequest(BaseModel):
    """Запрос на пометку слова как известного."""
    eng: str
    lang: str
    is_known: bool = True

class TestResultRequest(BaseModel):
    """Запрос на запись результата теста."""
    eng: str
    is_correct: bool
    lang: str

class TripletLearnedRequest(BaseModel):
    """Запрос на пометку тройки языков как изученной."""
    eng: str
    is_learned: bool = True

class GenericUpdateSchema(BaseModel):
    """Универсальная схема для inline-обновления любых записей."""
    id: int
    model_config = ConfigDict(extra='allow')

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        return cls(**dict(form_data))

class EventColorUpdate(BaseModel):
    """Схема обновления цвета событий."""
    color: str
    label: str = ""

class ConflictResolutionSchema(BaseModel):
    """Схема для разрешения конфликтов синхронизации."""
    model_config = ConfigDict(extra='allow')

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        return cls(**dict(form_data))

# --- DASHBOARD & ACTIONS ---

class UniversalFormSchema(BaseModel):
    """Схема для универсальной формы добавления (submit_form)."""
    common_text: str = Field(..., min_length=1)
    common_date: str
    common_category: str
    common_color: Optional[str] = "#ffffff"
    repeat: str = "none"
    repeat_end: Optional[str] = ""
    
    # Sticker data (nested)
    sticker_text: Optional[str] = ""
    sticker_title: Optional[str] = ""
    sticker_color: Optional[str] = "#fff9c4"
    sticker_type: Optional[str] = "text"
    sticker_apply_series: bool = False

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        data = dict(form_data)
        if "sticker_apply_series" in data:
            data["sticker_apply_series"] = str(data["sticker_apply_series"]).lower() in ["true", "on", "1"]
        return cls(**data)

class ChronoCreate(BaseModel):
    """Схема для создания записи в хронологии."""
    text: str = Field(..., min_length=1, max_length=10000)
    date: datetime

    @classmethod
    def as_form(cls, chrono_text: str = Form(...), chrono_date: str = Form(...)):
        from .utils import parse_date_input
        dt = parse_date_input(chrono_date)
        if isinstance(dt, date) and not isinstance(dt, datetime):
            dt = datetime.combine(dt, datetime.min.time())
        return cls(text=chrono_text, date=dt)

class ToggleDoneResponse(BaseModel):
    """Ответ для переключения статуса выполнения."""
    done: bool
    message: Optional[str] = None

class DashboardItem(BaseModel):
    """Элемент дашборда."""
    key: str
    title: str
    date: datetime
    model_config = ConfigDict(from_attributes=True)

# --- SETTINGS ---

class AppSettingBase(BaseModel):
    """Настройка приложения."""
    key: str
    value: str
    model_config = ConfigDict(from_attributes=True)

class AccountUpdateSchema(BaseModel):
    """Схема обновления данных аккаунта."""
    username: Optional[str] = Field(None, min_length=3, max_length=20)
    password: Optional[str] = Field(None, min_length=5)

    @classmethod
    def as_form(cls, username: Optional[str] = Form(None), password: Optional[str] = Form(None)):
        return cls(username=username, password=password)

class SettingsUpdateSchema(BaseModel):
    """Схема обновления глобальных настроек."""
    max_duration: Optional[int] = Field(None, ge=1, le=1440)
    max_random_minutes: Optional[int] = Field(None, ge=0, le=1440)

    @classmethod
    def as_form(cls, max_duration: Optional[int] = Form(None), max_random_minutes: Optional[int] = Form(None)):
        return cls(max_duration=max_duration, max_random_minutes=max_random_minutes)

class LanguageUpdateSchema(BaseModel):
    """Схема обновления порядков языков (динамические имена обрабатываются отдельно)."""
    active_order: str = Field(..., description="Comma-separated language codes")
    
    # Мы позволяем дополнительные поля для динамических имен языков (name_en, name_ru и т.д.)
    model_config = ConfigDict(extra='allow')

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        return cls(**dict(form_data))

class CategoryUpdateSchema(BaseModel):
    """Схема обновления категорий заметок."""
    categories_list: str = Field(..., description="Newline-separated list of categories")

    @classmethod
    def as_form(cls, categories_list: str = Form(...)):
        return cls(categories_list=categories_list)

class StickyNoteBase(BaseModel):
    """Базовая схема стикера (Sticky Note)."""
    title: Optional[str] = None
    text: str
    color: str = "#fff9c4"
    type: str = "text"

class StickyNoteCreate(StickyNoteBase):
    """Схема для создания стикера."""
    event_id: Optional[int] = None
    recurrence_id: Optional[str] = None
    task_id: Optional[int] = None
    habit_id: Optional[int] = None
    note_id: Optional[int] = None
    dialectics_id: Optional[int] = None

class StickyNoteView(StickyNoteBase):
    """Схема для отображения стикера."""
    id: int
    position: int
    created_at: datetime
    finished_at: Optional[datetime] = None
    event_id: Optional[int] = None
    recurrence_id: Optional[str] = None
    task_id: Optional[int] = None
    habit_id: Optional[int] = None
    note_id: Optional[int] = None
    dialectics_id: Optional[int] = None
    note: Optional[NoteView] = None
    model_config = ConfigDict(from_attributes=True)

# --- OBSERVATIONS ---

class ObservationBase(BaseModel):
    """Базовая схема наблюдения."""
    text: str
    priority: int = 1
    is_main: bool = False
    status: str = "periodic"
    end_time: Optional[str] = None
    no_time: bool = False

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

# --- DIALECTICS (Formerly Smart Notes) ---

class DialecticsBlock(BaseModel):
    """Блок содержимого 'Диалектики'."""
    side: str
    html: str

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
    content_json: str
    is_pinned: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
