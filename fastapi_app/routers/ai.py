from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Any, Optional
import os
import io
from groq import AsyncGroq
from pypdf import PdfReader

from ..services.auth import check_auth_dependency
from ..config import BASE_DIR
from ..logger import logger
from ..schemas.ai import (
    OppositesRequest, ParserRequest, TextMathRequest, 
    HintStepRequest, ExplainConceptRequest
)

router = APIRouter(
    tags=["ai"],
    prefix="/api/ai"
)

def get_groq_client() -> AsyncGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        raise HTTPException(
            status_code=500, 
            detail="GROQ_API_KEY is not set or invalid. Please configure it in the .env file."
        )
    return AsyncGroq(api_key=api_key)

_prompt_cache: dict[str, str] = {}

def get_cached_prompt(filename: str) -> str:
    if filename not in _prompt_cache:
        prompt_path = BASE_DIR / "prompts" / filename
        if not prompt_path.exists():
            logger.error(f"Prompt file not found at {prompt_path}")
            raise HTTPException(status_code=500, detail=f"Prompt file {filename} not found.")
        try:
            _prompt_cache[filename] = prompt_path.read_text(encoding="utf-8")
        except Exception as e:
            logger.error(f"Error reading prompt file: {e}")
            raise HTTPException(status_code=500, detail="Error reading prompt file.")
    return _prompt_cache[filename]

@router.post("/dialectics/opposites")
async def generate_opposites(
    request: OppositesRequest,
    user: Any = Depends(check_auth_dependency),
    client: AsyncGroq = Depends(get_groq_client)
):
    prompt_template = get_cached_prompt("opposites.md")
    system_prompt = prompt_template.replace("{ВСТАВИТЬ ПРОЦЕСС}", request.process_a).replace("{INSERT PROCESS}", request.process_a)

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generate opposites for the process: {request.process_a}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2048,
        )
        return {"result": chat_completion.choices[0].message.content}
    except Exception as e:
        logger.error(f"Error calling Groq API: {e}")
        raise HTTPException(status_code=502, detail=f"Error generating AI response: {str(e)}")

@router.post("/dialectics/parser")
async def parse_math_formula(
    request: ParserRequest,
    user: Any = Depends(check_auth_dependency),
    client: AsyncGroq = Depends(get_groq_client)
):
    system_prompt = get_cached_prompt("parser.md")
    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze the following formula: {request.formula}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=2048,
            response_format={"type": "json_object"}
        )
        return {"result": chat_completion.choices[0].message.content}
    except Exception as e:
        logger.error(f"Error calling Groq API: {e}")
        raise HTTPException(status_code=502, detail=f"Error generating AI parser response: {str(e)}")

@router.post("/dialectics/text-math")
async def generate_math_from_text(
    request: TextMathRequest,
    user: Any = Depends(check_auth_dependency),
    client: AsyncGroq = Depends(get_groq_client)
):
    try:
        prompt = "You are an assistant that translates the description of a mathematical formula in natural language strictly into LaTeX format. Output ONLY the LaTeX code, without surrounding quotes, without markdown blocks (```latex) and without any explanations. Your response must be ready to be inserted into the KaTeX renderer."
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Translate to LaTeX: {request.text}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=512,
        )
        result = chat_completion.choices[0].message.content.strip()
        if result.startswith("```latex"): result = result[8:]
        if result.startswith("```"): result = result[3:]
        if result.endswith("```"): result = result[:-3]
        return {"latex": result.strip()}
    except Exception as e:
        logger.error(f"Error calling Groq API for text-math: {e}")
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/dialectics/voice-math")
async def generate_math_from_voice(
    file: UploadFile = File(...),
    user: Any = Depends(check_auth_dependency),
    client: AsyncGroq = Depends(get_groq_client)
):
    try:
        content = await file.read()
        transcription = await client.audio.transcriptions.create(
            file=(file.filename, content, file.content_type),
            model="whisper-large-v3-turbo",
            response_format="text",
            language="ru"
        )
        transcribed_text = str(transcription).strip()
        prompt = "You are an assistant that translates the audio dictation of a mathematical formula strictly into LaTeX format. Account for potential transcription typos. Output ONLY the LaTeX code, without surrounding quotes, without markdown blocks (```latex) and without any explanations."
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Translate to LaTeX: {transcribed_text}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=512,
        )
        result = chat_completion.choices[0].message.content.strip()
        if result.startswith("```latex"): result = result[8:]
        if result.startswith("```"): result = result[3:]
        if result.endswith("```"): result = result[:-3]
        return {"latex": result.strip(), "transcribed_text": transcribed_text}
    except Exception as e:
        logger.error(f"Error processing voice-math: {e}")
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/dialectics/hint-step")
async def generate_hint_step(
    request: HintStepRequest,
    user: Any = Depends(check_auth_dependency),
    client: AsyncGroq = Depends(get_groq_client)
):
    valid_steps = ["step1", "step2", "step3", "step4", "step5"]
    if request.step_id not in valid_steps:
        raise HTTPException(status_code=400, detail="Invalid step_id")

    prompt_template = get_cached_prompt(f"dialectics_{request.step_id}.md")
    system_prompt = prompt_template.replace("{GOAL}", request.goal_text).replace("{CONTEXT}", request.context_text)

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generate the content for {request.step_id}."}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2048,
        )
        return {"result": chat_completion.choices[0].message.content}
    except Exception as e:
        logger.error(f"Error calling Groq API: {e}")
        raise HTTPException(status_code=502, detail=f"Error generating AI response: {str(e)}")

@router.post("/dialectics/article-parser")
async def process_article_parser(
    message: str = Form(...),
    file: Optional[UploadFile] = File(None),
    user: Any = Depends(check_auth_dependency),
    client: AsyncGroq = Depends(get_groq_client)
):
    prompt_template = get_cached_prompt("article_parser.md")
    
    extracted_text = ""
    if file:
        content = await file.read()
        if file.filename.endswith('.pdf'):
            try:
                reader = PdfReader(io.BytesIO(content))
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
            except Exception as e:
                logger.error(f"Error parsing PDF: {e}")
                raise HTTPException(status_code=400, detail="Could not parse PDF file.")
        else:
            try:
                extracted_text = content.decode('utf-8')
            except Exception as e:
                logger.error(f"Error reading text file: {e}")
                raise HTTPException(status_code=400, detail="Could not read text file.")
                
        if len(extracted_text) > 15000:
            extracted_text = extracted_text[:15000] + "... [Text truncated due to length limits]"
    else:
        extracted_text = "[No article text provided in this request.]"

    system_prompt = prompt_template.replace("{ARTICLE_CONTENT}", extracted_text)

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2048,
        )
        return {"result": chat_completion.choices[0].message.content}
    except Exception as e:
        logger.error(f"Error calling Groq API: {e}")
        raise HTTPException(status_code=502, detail=f"Error generating AI parser response: {str(e)}")

@router.post("/dialectics/explain-concept")
async def explain_concept(
    request: ExplainConceptRequest,
    user: Any = Depends(check_auth_dependency),
    client: AsyncGroq = Depends(get_groq_client)
):
    system_prompt = get_cached_prompt("explain_concept.md")
    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Explain the following concept: {request.text}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2048,
        )
        return {"result": chat_completion.choices[0].message.content}
    except Exception as e:
        logger.error(f"Error calling Groq API for explain-concept: {e}")
        raise HTTPException(status_code=502, detail=f"Error generating explanation: {str(e)}")
