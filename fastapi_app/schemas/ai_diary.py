"""AI diary payloads; historical event data remains readable."""
from typing import Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field, AwareDatetime, field_serializer


class ActivityCreate(BaseModel):
    kind: Literal['ai_request']
    step: int | None = Field(default=None, ge=1, le=5)
    request: str = Field(default='', max_length=2_000_000)
    question: str = Field(default='', max_length=50_000)
    text: str = Field(default='', max_length=2_000_000)
    status: Literal['completed', 'partial', 'failed', 'cancelled', 'not_applicable']
    operation: str = Field(default='', max_length=150)
    run_id: str | None = Field(default=None, max_length=100)
    started_at: AwareDatetime | None = None
    duration_ms: int | None = Field(default=None, ge=0)


class ActivityView(BaseModel):
    id: int
    note_id: int
    kind: str
    data: dict
    created_at: datetime
    note_title: str | None = None

    @field_serializer('created_at')
    def utc_timestamp(self, value):
        # SQLite CURRENT_TIMESTAMP stores UTC but drops timezone information.
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()
