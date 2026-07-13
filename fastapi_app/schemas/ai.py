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

from typing import Optional, List, Dict

class ExplainConceptRequest(BaseModel):
    text: str
    context_before: Optional[str] = None
    context_after: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None

class EditMathRequest(BaseModel):
    current_latex: str
    instruction: str

class CheckAIRequest(BaseModel):
    text: str
    history: Optional[List[Dict[str, str]]] = None
