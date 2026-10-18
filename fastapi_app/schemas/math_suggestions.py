from typing import Literal

from pydantic import BaseModel, Field, model_validator


class MathContextPassage(BaseModel):
    block_id: str = Field(min_length=1, max_length=128)
    title: str = Field(default='', max_length=500)
    text: str = Field(min_length=1, max_length=1200)


class MathDefinitionRequest(BaseModel):
    note_title: str = Field(default='', max_length=255)
    block_id: str = Field(min_length=1, max_length=128)
    formula: str = Field(min_length=1, max_length=20_000)
    symbol: str = Field(default='', max_length=300)
    value: str = Field(default='', max_length=1000)
    start: int | None = Field(default=None, ge=0)
    end: int | None = Field(default=None, ge=1)
    original_formulas: list[str] = Field(default_factory=list, max_length=3)
    passages: list[MathContextPassage] = Field(default_factory=list, max_length=8)

    @model_validator(mode='after')
    def valid_target(self):
        if not self.symbol.strip() and not self.value.strip():
            raise ValueError('A symbol or number is required')
        if any(len(formula) > 20_000 for formula in self.original_formulas):
            raise ValueError('Original formula is too long')
        if self.value and (self.start is None or self.end is None
                           or not 0 <= self.start < self.end <= len(self.formula)
                           or self.formula[self.start:self.end] != self.value):
            raise ValueError('The number must match its position in the formula')
        return self


class MathDefinitionSource(MathContextPassage):
    quote: str = Field(min_length=1, max_length=1200)


class MathDefinitionSuggestion(BaseModel):
    status: Literal['found', 'uncertain', 'not_found']
    definition: str = Field(default='', max_length=5000)
    reason: str = Field(default='', max_length=800)
    sources: list[MathDefinitionSource] = Field(default_factory=list, max_length=3)
