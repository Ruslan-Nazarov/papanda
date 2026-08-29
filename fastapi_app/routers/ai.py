from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Any
import json
import base64
import tempfile
import os
import io
import aiofiles.os
from pypdf import PdfReader

from fastapi_app.services.ai_service import ai_service
from fastapi_app.services.locale_utils import normalize_locale
from fastapi_app.rate_limiter import limiter

router = APIRouter()

def _try_parse_json(raw: str, fallback: Any = None) -> Any:
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return fallback if fallback is not None else raw

class DialecticsHintRequest(BaseModel):
    step_id: str = Field(..., max_length=100)
    current_content: str = Field(..., max_length=50_000)
    note_title: Optional[str] = Field(default="", max_length=300)
    mode: Optional[str] = Field(default="hint", max_length=50)

class OppositesRequest(BaseModel):
    process_a: str = Field(..., max_length=5_000)
    locale: Optional[str] = Field(default=None, max_length=20)

class ExplainRequest(BaseModel):
    text: str = Field(..., max_length=10_000)
    context_before: Optional[str] = Field(default="", max_length=5_000)
    context_after: Optional[str] = Field(default="", max_length=5_000)
    history: Optional[List[dict]] = Field(default=[], max_length=30)

class ParserRequest(BaseModel):
    formula: str = Field(..., max_length=5_000)

class TextMathRequest(BaseModel):
    text: str = Field(..., max_length=10_000)
    
class EditMathRequest(BaseModel):
    formula: str = Field(..., max_length=5_000)
    instruction: str = Field(..., max_length=5_000)

class HintRequest(BaseModel):
    step_id: str = Field(..., max_length=100)
    goal_text: Optional[str] = Field(default="", max_length=1_000)
    context_text: Optional[str] = Field(default="", max_length=50_000)

class CheckRequest(BaseModel):
    text: str = Field(..., max_length=50_000)
    history: Optional[List[dict]] = Field(default=[], max_length=30)

class AutofillRequest(BaseModel):
    anchor_text: str = Field(..., max_length=5_000)
    note_title: Optional[str] = Field(default="", max_length=300)

class GenerateStepRequest(BaseModel):
    context_text: str = Field(..., max_length=50_000)
    target_step: str = Field(..., max_length=100)

@router.post("/opposites")
@limiter.limit("5/minute")
async def generate_opposites(request: Request, data: OppositesRequest):
    locale = normalize_locale(request.state.locale)
    result = await ai_service.get_opposites(data.process_a, locale=locale)
    return {"result": result}

@router.post("/explain-concept")
@limiter.limit("10/minute")
async def explain_concept(request: Request, data: ExplainRequest):
    locale = normalize_locale(request.state.locale)
    result = await ai_service.explain_concept(
        text=data.text,
        context_before=data.context_before or "",
        context_after=data.context_after or "",
        history=data.history or [],
        locale=locale
    )
    return {"result": result, "user_query": data.text}

@router.post("/parser")
@limiter.limit("20/minute")
async def parser(request: Request, data: ParserRequest):
    result = await ai_service.generate_parser(data.formula)
    return {"result": _try_parse_json(result)}

@router.post("/text-math")
@limiter.limit("10/minute")
async def text_math(request: Request, data: TextMathRequest):
    result = await ai_service.generate_parser(data.text)
    return {"result": result}
    
@router.post("/edit-math")
@limiter.limit("10/minute")
async def edit_math(request: Request, data: EditMathRequest):
    result = await ai_service.edit_math(data.instruction, data.formula)
    return {"result": _try_parse_json(result)}

@router.post("/formula/ocr")
@limiter.limit("5/minute")
async def ocr_formula(request: Request, file: UploadFile = File(...)):
    contents = await file.read()
    base64_encoded = base64.b64encode(contents).decode('utf-8')
    result = await ai_service.ocr_formula(base64_encoded)
    return {"result": _try_parse_json(result)}

@router.post("/voice-math")
@limiter.limit("5/minute")
async def voice_math(request: Request, file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        temp_audio.write(await file.read())
        temp_audio_path = temp_audio.name
        
    try:
        text = await ai_service.transcribe_audio(temp_audio_path)
        result = await ai_service.generate_parser(text)
        parsed = _try_parse_json(result)
        if isinstance(parsed, dict) and "formula" in parsed:
            return {"result": parsed.get("formula", text)}
        return {"result": result}
    finally:
        if await aiofiles.os.path.exists(temp_audio_path):
            await aiofiles.os.remove(temp_audio_path)

@router.post("/article-parser")
@limiter.limit("5/minute")
async def article_parser(
    request: Request, 
    message: str = Form(...), 
    file: Optional[UploadFile] = File(None),
    article_text: Optional[str] = Form(None)
):
    text_to_parse = article_text or ""
    
    if file:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        try:
            contents = await file.read()
            pdf_reader = PdfReader(io.BytesIO(contents))
            for page in pdf_reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_to_parse += extracted + "\n"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")
    
    if not text_to_parse.strip():
        raise HTTPException(status_code=400, detail="Must provide valid file or article_text")
        
    result = await ai_service.parse_article(text_to_parse[:15000], user_instruction=message)
    fallback = [{"side": "left", "html": f"<p>{result}</p>", "role": "thesis"}]
    return {"result": _try_parse_json(result, fallback=fallback)}

@router.post("/hint-step")
@router.post("/hint")
@limiter.limit("15/minute")
async def get_dialectics_hint(
    req: DialecticsHintRequest, 
    request: Request
):
    locale = getattr(request.state, "locale", "ru")
    hint_text = await ai_service.generate_dialectics_hint(
        step_id=req.step_id,
        current_content=req.current_content,
        note_title=req.note_title,
        locale=locale,
        mode=req.mode or "hint"
    )
    return {"result": hint_text, "hint": hint_text}

@router.post("/check-ai")
@limiter.limit("10/minute")
async def check_logic(request: Request, data: CheckRequest):
    locale = normalize_locale(request.state.locale)
    result = await ai_service.check_logic(data.text, data.history or [], locale=locale)
    return {"result": result}

@router.get("/notes/hints")
@limiter.limit("20/minute")
async def get_notes_hints(request: Request):
    return {"hints": {
        "anchor": "Что мы хотим изучить?",
        "step1": "С чего всё начинается?",
        "step2": "Что противостоит этому?",
        "step3": "Как они взаимодействуют?",
        "step4": "К чему это приводит?",
        "step5": "Какой итоговый синтез?"
    }}

@router.post("/autofill-conspect")
@limiter.limit("5/minute")
async def autofill_conspect(request: Request, data: AutofillRequest):
    locale = normalize_locale(request.state.locale)
    result = await ai_service.autofill_conspect(data.anchor_text, data.note_title or "", locale=locale)
    return {"result": _try_parse_json(result)}

@router.post("/generate-next-step")
@limiter.limit("5/minute")
async def generate_next_step(request: Request, data: GenerateStepRequest):
    locale = normalize_locale(request.state.locale)
    result = await ai_service.generate_next_step(data.context_text, data.target_step, locale=locale)
    return {"result": _try_parse_json(result)}



