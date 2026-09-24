from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Any, AsyncIterator, Literal
from contextlib import aclosing
import json
import base64
import tempfile
import aiofiles.os

from fastapi_app.services.article_fetch import fetch_article as _fetch_article_from_url
from fastapi_app.services.import_service import read_upload, extract_pdf
from fastapi_app.services.ai_service import ai_service
from fastapi_app.services.locale_utils import normalize_locale
from fastapi_app.services.abuse_guard import reserve_generation
from fastapi_app.rate_limiter import limiter

from fastapi_app.services.context_builder import ContextBuilder
from fastapi_app.services.sanitizer import Sanitizer
from fastapi_app.services.rag_tool_manager import RAGManager
from fastapi_app.services.ai_router_service import ConspectusRouter

router = APIRouter()

conspectus_router = ConspectusRouter(
    ai_service, 
    ContextBuilder(), 
    Sanitizer(), 
    RAGManager(ai_service)
)


def _try_parse_json(raw: str, fallback: Any = None) -> Any:
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return fallback if fallback is not None else raw


def _sse_response(event_source) -> StreamingResponse:
    async def event_stream():
        try:
            async with aclosing(event_source) as src:
                async for ev in src:
                    yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _sse(token_gen: AsyncIterator[str]) -> StreamingResponse:
    """Поток токенов текста → SSE-кадры {"delta": "..."}, затем {"done": true}."""
    async def as_events():
        async with aclosing(token_gen) as tg:
            async for tok in tg:
                if tok:
                    yield {"delta": tok}
    return _sse_response(as_events())

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

class CheckRequest(BaseModel):
    text: str = Field(..., max_length=50_000)
    history: Optional[List[dict]] = Field(default=[], max_length=30)

class AutofillRequest(BaseModel):
    anchor_text: str = Field(..., max_length=5_000)
    note_title: Optional[str] = Field(default="", max_length=300)

class GenerateStepRequest(BaseModel):
    context_text: str = Field(..., max_length=50_000)
    target_step: str = Field(..., max_length=100, pattern=r'^(?:step)?[1-5](?:\.[1-9][0-9]*)?$')

class ConspectusRouteRequest(BaseModel):
    action: Literal['generate_full', 'generate_step']
    context_state: dict = Field(default_factory=dict)
    target_step: Optional[str] = Field(default=None, pattern=r'^[1-5]$')
    pinned_step: Optional[str] = Field(default=None, pattern=r'^[1-5]$')
    question: Optional[str] = Field(default=None, max_length=2000)

    @model_validator(mode='after')
    def require_target(self):
        if self.action == 'generate_step' and self.target_step is None:
            raise ValueError('target_step is required for generate_step')
        return self


@router.post("/explain-concept")
@limiter.limit("10/minute")
async def explain_concept(request: Request, data: ExplainRequest):
    locale = normalize_locale(request.state.locale)
    result = await ai_service.explain_concept(
        text=data.text,
        context_before=data.context_before or "",
        context_after=data.context_after or "",
        history=data.history or [],
        locale=locale,
    )
    return {"result": result, "user_query": data.text}

@router.post("/explain-concept/stream")
@limiter.limit("10/minute")
async def explain_concept_stream(request: Request, data: ExplainRequest):
    locale = normalize_locale(request.state.locale)
    return _sse(ai_service.explain_concept_stream(
        text=data.text,
        context_before=data.context_before or "",
        context_after=data.context_after or "",
        history=data.history or [],
        locale=locale,
    ))

@router.post("/parser")
@limiter.limit("20/minute")
async def parser(request: Request, data: ParserRequest):
    result = await ai_service.generate_parser(data.formula)
    return {"result": _try_parse_json(result)}

@router.post("/text-math")
@limiter.limit("10/minute")
async def text_math(request: Request, data: TextMathRequest):
    result = await ai_service.text_to_formula(data.text)
    return {"result": _try_parse_json(result)}
    
@router.post("/edit-math")
@limiter.limit("10/minute")
async def edit_math(request: Request, data: EditMathRequest):
    result = await ai_service.edit_math(data.instruction, data.formula)
    return {"result": _try_parse_json(result)}

@router.post("/formula/ocr")
@limiter.limit("5/minute")
async def ocr_formula(request: Request, file: UploadFile = File(...)):
    contents = await read_upload(file)
    base64_encoded = base64.b64encode(contents).decode('utf-8')
    result = await ai_service.ocr_formula(base64_encoded)
    return {"result": _try_parse_json(result)}

@router.post("/voice-math")
@limiter.limit("5/minute")
async def voice_math(request: Request, file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        temp_audio.write(await read_upload(file))
        temp_audio_path = temp_audio.name
        
    try:
        text = await ai_service.transcribe_audio(temp_audio_path)
        result = await ai_service.text_to_formula(text)
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
    article_text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
):
    text_to_parse = article_text or ""

    if url and url.strip():
        text_to_parse = await _fetch_article_from_url(url.strip())

    if file:
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        text_to_parse += await extract_pdf(await read_upload(file))
    
    if not text_to_parse.strip():
        raise HTTPException(status_code=400, detail="Нужна ссылка, файл или текст статьи")

    result = await ai_service.parse_article(text_to_parse[:15000], user_instruction=message)
    return {"result": result}

@router.post("/check-ai")
@limiter.limit("10/minute")
async def check_logic(request: Request, data: CheckRequest):
    locale = normalize_locale(request.state.locale)
    result = await ai_service.check_logic(data.text, data.history or [], locale=locale)
    return {"result": result}

@router.post("/check-ai/stream")
@limiter.limit("10/minute")
async def check_logic_stream(request: Request, data: CheckRequest):
    locale = normalize_locale(request.state.locale)
    return _sse(ai_service.check_logic_stream(data.text, data.history or [], locale=locale))

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

@router.post("/conspectus/route")
@limiter.limit("15/minute")
async def route_conspectus_request(request: Request, data: ConspectusRouteRequest):
    locale = normalize_locale(getattr(request.state, "locale", "ru"))
    if data.action in ("generate_full", "generate_step"):
        await reserve_generation(request)
    payload = data.dict()
    payload["locale"] = locale
    result = await conspectus_router.route_request(payload)
    return result

@router.post("/conspectus/generate-full/stream")
@limiter.limit("15/minute")
async def stream_generate_full(request: Request, data: ConspectusRouteRequest):
    """Прогрессивная генерация конспекта: SSE-кадры {"step": "stepN", "content": "..."}
    по мере готовности каждого шага, {"status": "..."} для долгих операций
    (проверка судьёй, повторная попытка), затем {"done": true}."""
    locale = normalize_locale(getattr(request.state, "locale", "ru"))
    await reserve_generation(request)

    async def events():
        async for step_key, content in conspectus_router.stream_generate_full(
            data.context_state or {}, locale, use_skeleton=True,
            pinned_step=data.pinned_step, question=data.question,
        ):
            if step_key == "__status__":
                yield {"status": content}
            elif step_key == "__titles__":
                yield {"titles": content}
            elif step_key == "__note_meta__":
                yield {"note_meta": content}
            elif step_key == "__report__":
                yield {"report": content}
            elif step_key == "__not_applicable__":
                yield {"not_applicable": content}
            else:
                yield {"step": step_key, "content": content}

    return _sse_response(events())
