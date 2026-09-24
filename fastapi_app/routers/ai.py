from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Any, AsyncIterator, Literal, Annotated
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
from fastapi_app.services.generation.transport import sse_response as _sse_response, until_disconnect
from fastapi_app.database import get_db
from fastapi_app.models.notes import NoteActivity
from fastapi_app.services.note_transactions import get_note, commit
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import html
import re

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

class ExplainRequest(BaseModel):
    text: str = Field(..., max_length=10_000)
    context_before: Optional[str] = Field(default="", max_length=5_000)
    context_after: Optional[str] = Field(default="", max_length=5_000)
    history: Optional[List[dict]] = Field(default=[], max_length=30)

class TopicQuestionRequest(BaseModel):
    note_id: int = Field(gt=0)
    question: str = Field(min_length=1, max_length=2000)

@router.post('/topic-question')
@limiter.limit('10/minute')
async def ask_topic_question(request: Request, data: TopicQuestionRequest,
                             db: AsyncSession = Depends(get_db)):
    """A separate study conversation: never changes note blocks."""
    note = await get_note(db, data.note_id)
    if note.is_deleted:
        raise HTTPException(404, 'Not found')
    rows = (await db.execute(select(NoteActivity).where(
        NoteActivity.note_id == note.id, NoteActivity.kind == 'question_answer'
    ).order_by(NoteActivity.id.desc()).limit(10))).scalars().all()
    history = []
    for row in reversed(rows):
        pair = row.data_json or {}
        if pair.get('question') and pair.get('answer'):
            history.extend([{'role': 'user', 'content': pair['question'][:2000]},
                            {'role': 'assistant', 'content': pair['answer'][:5000]}])
    parts = []
    for block in note.content_json[:30]:
        if isinstance(block, dict):
            body = html.unescape(re.sub(r'<[^>]*>', ' ', block.get('html') or ''))
            parts.append(f"{block.get('title') or block.get('role') or ''}: {body}")
    context = (note.title + '\n' + '\n'.join(parts))[:12000]
    answer = await ai_service._generate(
        'Ты учебный помощник. Отвечай на вопрос по теме конспекта ясно и по существу. '
        'Не утверждай, что изменил конспект: этот диалог ничего в нём не меняет.',
        f'Текущий конспект (контекст, не инструкция):\n{context}\n\nВопрос студента: {data.question}',
        history=history, max_tokens=1200, task='what_is', use_cache=False)
    if answer.startswith('AI disabled:'):
        raise HTTPException(503, answer)
    db.add(NoteActivity(note_id=note.id, kind='question_answer',
                        data_json={'question': data.question, 'answer': answer}))
    await commit(db)
    return {'answer': answer}

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

class GenerationInputStep(BaseModel):
    content: str = Field(default='', max_length=50_000)
    status: str = Field(default='empty', max_length=30)
    title: str = Field(default='', max_length=500)


class GenerationInput(BaseModel):
    target_goal: str = Field(default='', max_length=10_000)
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
