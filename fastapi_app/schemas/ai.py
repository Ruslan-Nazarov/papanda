from pydantic import BaseModel

class OppositesRequest(BaseModel):
    process_a: str

class ParserRequest(BaseModel):
    formula: str

class TextMathRequest(BaseModel):
    text: str

class HintStepRequest(BaseModel):
    step_id: str
    goal_text: str
    context_text: str

class ExplainConceptRequest(BaseModel):
    text: str
