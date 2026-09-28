"""AI diary payloads; historical event data remains readable."""
from typing import Literal
from pydantic import BaseModel, Field


class ActivityCreate(BaseModel):
    kind: Literal['ai_request']
    step: int | None = Field(default=None, ge=1, le=5)
    request: str = Field(default='', max_length=2_000_000)
    question: str = Field(default='', max_length=50_000)
    text: str = Field(default='', max_length=2_000_000)
    status: Literal['completed', 'partial', 'failed', 'cancelled', 'not_applicable']
    operation: str = Field(default='', max_length=150)
    run_id: str | None = Field(default=None, max_length=100)
