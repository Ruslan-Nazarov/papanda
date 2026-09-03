from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict

class SubStep(BaseModel):
    sub_id: str
    subtitle: str
    content: str
    order: int
    author: Literal["ai", "human"]

class ConspectusStep(BaseModel):
    status: Literal["empty", "draft", "ready", "invalidated", "in_progress", "done"] = "empty"
    content: str = ""
    author: Optional[Literal["ai", "human"]] = None
    sub_steps: List[SubStep] = Field(default_factory=list)

class ConspectusState(BaseModel):
    domain_type: Literal["math_code", "humanitarian", "general"] = "general"
    title: str = ""
    anchor_text: str = ""
    steps: Dict[str, ConspectusStep] = Field(default_factory=dict)
