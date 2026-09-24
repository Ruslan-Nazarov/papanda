from typing import Literal
from pydantic import BaseModel, Field


class ForkRequest(BaseModel):
    revision: int = Field(ge=1)
    from_step: int = Field(ge=1, le=5)
    label: str = Field(min_length=1, max_length=120)
    origin: Literal['human', 'ai'] = 'human'


class ActivityCreate(BaseModel):
    kind: Literal['ai_proposed', 'ai_accepted', 'ai_edited', 'ai_rejected',
                  'ai_full_review', 'question_answer', 'variant_chosen']
    step: int | None = Field(default=None, ge=1, le=5)
    text: str = Field(default='', max_length=50000)
    detail: str = Field(default='', max_length=2000)
    run_id: str | None = Field(default=None, max_length=100)


class GoalUpdate(BaseModel):
    revision: int = Field(ge=1)
    long_term_goal: bool
