from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Any, AsyncIterator, Literal, Annotated
from contextlib import aclosing
import json
import base64
import asyncio
import tempfile
import aiofiles.os

from fastapi_app.services.import_service import read_upload
from fastapi_app.services.request_document import extract_request_document, MAX_DOCUMENT_BYTES
from fastapi_app.services.article_exposition import prepare_article
from fastapi_app.schemas.notes import RequestDocument, MathSymbol, MathNumberDefinition
from fastapi_app.schemas.math_suggestions import MathDefinitionRequest, MathDefinitionSuggestion
from fastapi_app.services.math_suggestions import parse_suggestion
from fastapi_app.services.ai_service import ai_service
from fastapi_app.services.locale_utils import normalize_locale
from fastapi_app.services.abuse_guard import reserve_generation
from fastapi_app.rate_limiter import limiter

from fastapi_app.services.context_builder import ContextBuilder
from fastapi_app.services.sanitizer import Sanitizer
from fastapi_app.services.rag_tool_manager import RAGManager
from fastapi_app.services.ai_router_service import ConspectusRouter
from fastapi_app.services.generation.transport import sse_response as _sse_response, until_disconnect

router = APIRouter()

conspectus_router = ConspectusRouter(
    ai_service, 
    ContextBuilder(), 
    Sanitizer(), 
    RAGManager()
)


def _try_parse_json(raw: str, fallback: Any = None) -> Any:
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return fallback if fallback is not None else raw


def _sse(token_gen: AsyncIterator[str]) -> StreamingResponse:
    """Текстовый поток с типизированным конвертом и явным terminal."""
    async def as_events():
        async with aclosing(token_gen) as tg:
            async for tok in tg:
                if tok:
                    yield {"delta": tok}
    return _sse_response(as_events())

class NotePassage(BaseModel):
    block_id: str = Field(max_length=128)
    title: str = Field(default="", max_length=500)
    text: str = Field(max_length=1200)
    kind: Literal['block', 'dictionary', 'link', 'draft', 'version'] = 'block'
    reference: str = Field(default='', max_length=500)
    url: str = Field(default='', max_length=2000)
    reason: str = Field(default='', max_length=2000)


class ExplainRequest(BaseModel):
    text: str = Field(..., max_length=10_000)
    note_title: str = Field(default="", max_length=255)
    context_before: Optional[str] = Field(default="", max_length=5_000)
    context_after: Optional[str] = Field(default="", max_length=5_000)
    history: Optional[List[dict]] = Field(default=[], max_length=30)
    question: str = Field(default="", max_length=2_000)
    note_passages: List[NotePassage] = Field(default_factory=list, max_length=5)


class ArticleExpositionRequest(BaseModel):
    url: str = Field(default='', max_length=2000)
    title: str = Field(default='', max_length=1000)
    quote: str = Field(default='', max_length=100_000)
    selection: str = Field(default='', max_length=500)
    note_title: str = Field(default='', max_length=255)
    block_title: str = Field(default='', max_length=500)

    @model_validator(mode='after')
    def require_content(self):
        if not self.url.strip() and not self.quote.strip():
            raise ValueError('A source URL or excerpt is required')
        return self


class CalculationRequest(BaseModel):
    formula: str = Field(min_length=1, max_length=20_000, pattern=r'\S')
    original_formulas: List[Annotated[str, Field(max_length=20_000)]] = Field(default_factory=list, max_length=3)
    math_symbols: List[MathSymbol] = Field(default_factory=list, max_length=80)
    number_definitions: List[MathNumberDefinition] = Field(default_factory=list, max_length=80)
    note_title: str = Field(default='', max_length=255)
    context_before: str = Field(default='', max_length=500)
    context_after: str = Field(default='', max_length=5_000)
    history: List[dict] = Field(default_factory=list, max_length=6)
    question: str = Field(default='', max_length=2_000)
    note_passages: List[NotePassage] = Field(default_factory=list, max_length=5)

class TextMathRequest(BaseModel):
    text: str = Field(..., max_length=10_000)
    
class EditMathRequest(BaseModel):
    formula: str = Field(..., max_length=5_000)
    instruction: str = Field(..., max_length=5_000)

class CheckRequest(BaseModel):
    text: str = Field(..., max_length=50_000)
    history: Optional[List[dict]] = Field(default=[], max_length=30)

class FillBlockRequest(BaseModel):
    note_title: str = Field(default='', max_length=255)
    block_title: str = Field(..., min_length=1, max_length=500)
    block_text: str = Field(default='', max_length=10_000)
    context_before: str = Field(default='', max_length=5_000)
    context_after: str = Field(default='', max_length=5_000)

class GenerationInputSticker(BaseModel):
    title: str = Field(default='', max_length=500)
    text: str = Field(default='', max_length=10_000)


class GenerationInputStep(BaseModel):
    content: str = Field(default='', max_length=50_000)
    status: str = Field(default='empty', max_length=30)
    title: str = Field(default='', max_length=500)
    stickers: List[GenerationInputSticker] = Field(default_factory=list, max_length=1000)
    generation_data: Optional[dict] = None


class GenerationRejectedDraft(BaseModel):
    block_id: str = Field(max_length=128)
    role: str = Field(default='', max_length=100)
    title: str = Field(default='', max_length=500)
    content: str = Field(max_length=3_000_000)
    reason: str = Field(default='', max_length=2000)


class GenerationInput(BaseModel):
    target_goal: str = Field(default='', max_length=10_000)
    reference: Optional[str] = Field(default=None, max_length=2 * 1024 * 1024)
    rejected_drafts: List[GenerationRejectedDraft] = Field(default_factory=list, max_length=10_000)
    steps: dict[Annotated[str, Field(pattern=r'^step[1-5](?:\.[1-9][0-9]*)?$')], GenerationInputStep] = Field(default_factory=dict, max_length=100)


class ConspectusRouteRequest(BaseModel):
    action: Literal['generate_full', 'generate_step']
    context_state: GenerationInput = Field(default_factory=GenerationInput)
    target_step: Optional[str] = Field(default=None, pattern=r'^[1-5]$')
    pinned_step: Optional[str] = Field(default=None, pattern=r'^[1-5]$')
    question: Optional[str] = Field(default=None, max_length=2000)
    source_revision: Optional[int] = Field(default=None, ge=1)

    @model_validator(mode='after')
    def require_target(self):
        if self.action == 'generate_step' and self.target_step is None:
            raise ValueError('target_step is required for generate_step')
        return self


@router.post('/documents/extract', response_model=RequestDocument)
@limiter.limit('20/minute')
async def extract_document(request: Request, file: UploadFile = File(...)):
    data = await read_upload(file, max_bytes=MAX_DOCUMENT_BYTES)
    return await asyncio.to_thread(extract_request_document, data, file.filename or '')


@router.post("/explain-concept")
@limiter.limit("10/minute")
async def explain_concept(request: Request, data: ExplainRequest):
    locale = normalize_locale(request.state.locale)
    result = await ai_service.explain_concept(
        text=data.text,
        context_before=data.context_before or "",
        context_after=data.context_after or "",
        note_title=data.note_title,
        history=data.history or [],
        locale=locale,
        question=data.question,
        note_passages=[passage.model_dump(exclude_unset=True) for passage in data.note_passages],
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
        note_title=data.note_title,
        history=data.history or [],
        locale=locale,
        question=data.question,
        note_passages=[passage.model_dump(exclude_unset=True) for passage in data.note_passages],
    ))

@router.post('/explain-article/stream')
@limiter.limit('10/minute')
async def explain_article_stream(request: Request, data: ArticleExpositionRequest):
    await reserve_generation(request)
    article = await until_disconnect(request, prepare_article(data))
    locale = normalize_locale(getattr(request.state, 'locale', 'ru'))

    async def events():
        yield {'status': 'article_loaded', 'source_scope': article['scope'], 'selection': article['selection']}
        async with aclosing(ai_service.explain_article_stream(article, locale=locale)) as stream:
            async for delta in stream:
                if delta:
                    yield {'delta': delta}

    return _sse_response(events())


@router.post('/explain-calculation/stream')
@limiter.limit('10/minute')
async def explain_calculation_stream(request: Request, data: CalculationRequest):
    locale = normalize_locale(getattr(request.state, 'locale', 'ru'))
    return _sse(ai_service.explain_calculation_stream(data.model_dump(), locale=locale))


@router.post('/math-definition', response_model=MathDefinitionSuggestion)
@limiter.limit('10/minute')
async def suggest_math_definition(request: Request, data: MathDefinitionRequest):
    locale = normalize_locale(getattr(request.state, 'locale', 'ru'))
    raw = await ai_service.suggest_math_definition(data.model_dump(), locale=locale)
    if not raw or raw.startswith(('AI disabled:', 'Error calling AI:')):
        raise HTTPException(status_code=503, detail='AI suggestion is unavailable')
    try:
        return parse_suggestion(raw, [passage.model_dump() for passage in data.passages])
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status_code=502, detail='AI returned an invalid suggestion')


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

@router.post('/fill-block')
@limiter.limit('15/minute')
async def fill_block(request: Request, data: FillBlockRequest):
    await reserve_generation(request)
    locale = normalize_locale(getattr(request.state, 'locale', 'ru'))
    content = await ai_service.fill_block(
        data.note_title, data.block_title, data.block_text,
        data.context_before, data.context_after, locale=locale,
    )
    if not content or content.startswith(('AI disabled:', 'Error calling AI:')):
        raise HTTPException(status_code=503, detail=content or 'AI returned an empty block')
    return {'content': content}

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
    payload = data.model_dump()
    payload["locale"] = locale
    result = await until_disconnect(request, conspectus_router.route_request(payload))
    return result

@router.post("/conspectus/generate-full/stream")
@limiter.limit("15/minute")
async def stream_generate_full(request: Request, data: ConspectusRouteRequest):
    """Фазы работы, итоговые блоки и terminal с единым результатом генерации."""
    locale = normalize_locale(getattr(request.state, "locale", "ru"))
    await reserve_generation(request)

    async def events():
        async with aclosing(conspectus_router.stream_generate_full(
            data.context_state.model_dump(), locale, use_skeleton=True,
            pinned_step=data.pinned_step, question=data.question,
            source_revision=data.source_revision,
        )) as source:
            async for step_key, content in source:
                if step_key == "__terminal__":
                    yield {"result": content}
                elif step_key == "__status__":
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

    return _sse_response(events(), terminal_required=True, source_revision=data.source_revision)
