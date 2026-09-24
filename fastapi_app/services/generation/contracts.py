from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictStr, model_validator

Text = Annotated[StrictStr, Field(min_length=1, pattern=r'\S')]
StepKey = Annotated[StrictStr, Field(pattern=r'^[1-5](?:\.[1-9][0-9]*)?$')]
RunStatus = Literal['completed', 'partial', 'failed', 'cancelled', 'not_applicable']


class Contract(BaseModel):
    model_config = ConfigDict(strict=True, extra='allow')


class Process(Contract):
    thesis: Text


class FirstProcess(Process):
    потенциально_содержит: Text
    three_conditions: dict[str, Text]

    @model_validator(mode='after')
    def three_reasons(self):
        if len(self.three_conditions) != 3:
            raise ValueError('Exactly three condition explanations are required')
        return self


class FirstStage(Contract):
    applicable: StrictBool
    applicability_reason: Text
    goal_as_process: Text
    step1: FirstProcess | None = None

    @model_validator(mode='after')
    def process_required(self):
        if self.applicable and self.step1 is None:
            raise ValueError('Applicable topic requires step1')
        return self


class Development(Process):
    id: Text
    grows_from: Text
    разворачивает: Text
    обратный_ход: Text


class SecondStage(Contract):
    blocks: list[Development] = Field(min_length=2, max_length=8)

    @model_validator(mode='after')
    def validate_graph(self):
        by_id = {b.id: b for b in self.blocks}
        if len(by_id) != len(self.blocks) or 'step1' in by_id:
            raise ValueError('Duplicate/reserved process IDs')
        ordered, available = [], {'step1'}
        while len(ordered) != len(self.blocks):
            ready = [b for b in self.blocks if b.id not in available and b.grows_from in available]
            if not ready:
                raise ValueError('Unknown parent or cycle in development graph')
            ordered.extend(ready)
            available.update(b.id for b in ready)
        self.blocks = ordered
        return self


class Opposite(Process):
    обходится_без: Text


class Contradiction(Process):
    несовместимость: Text
    необходимость_A: Text
    необходимость_B: Text


class Resolution(Process):
    тип_разрешения: Literal['замена', 'продолжение']
    скачок: Text


class StageVerdict(Contract):
    valid: StrictBool
    reason: StrictStr
    checks: dict[str, StrictBool] = Field(default_factory=dict)
    problem_block_ids: list[Text] = Field(default_factory=list)

    @model_validator(mode='after')
    def consistent_checks(self):
        if self.valid and (self.problem_block_ids or any(value is False for value in self.checks.values())):
            raise ValueError('Valid verdict contradicts failed checks')
        return self


class JudgeResponse(Contract):
    is_valid: StrictBool
    reason: StrictStr
    bad_transitions: list[Literal['1', '2', '3', '4', '5']] = Field(default_factory=list)

    @model_validator(mode='after')
    def consistent_transitions(self):
        if self.is_valid and self.bad_transitions:
            raise ValueError('Valid verdict contradicts bad transitions')
        return self


class JudgeVerdict(BaseModel):
    status: Literal['passed', 'failed', 'unavailable'] = 'unavailable'
    reason: str = ''
    bad_steps: list[str] = Field(default_factory=list)
    model: str | None = None


class Postprocess(Contract):
    titles: dict[StepKey, StrictStr] = Field(default_factory=dict)
    note_title: StrictStr = ''
    anchor_title: StrictStr = ''
    anchor_summary: StrictStr = ''


class GenerationResult(BaseModel):
    run_id: str
    status: RunStatus
    source_revision: int | None = None
    updated_steps: dict = Field(default_factory=dict)
    replace_bases: list[str] = Field(default_factory=list)
    step_titles: dict[str, str] = Field(default_factory=dict)
    note_meta: dict[str, str] = Field(default_factory=dict)
    verdict: dict = Field(default_factory=dict)
    judge: JudgeVerdict = Field(default_factory=JudgeVerdict)
    report: dict = Field(default_factory=dict)
    error_message: str | None = None


class GenerationEvent(BaseModel):
    model_config = ConfigDict(extra='allow')
    type: Literal['started', 'status', 'step', 'titles', 'note_meta', 'report',
                  'not_applicable', 'delta', 'terminal']
    run_id: str
    sequence: int = Field(ge=1)
