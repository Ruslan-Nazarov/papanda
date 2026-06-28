from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Any, Optional
import os
import io
import json
from groq import AsyncGroq
from pypdf import PdfReader

from ..services.auth import check_auth_dependency
from ..config import BASE_DIR
from ..logger import logger
from ..schemas.ai import (
    OppositesRequest, ParserRequest, TextMathRequest, 
    HintStepRequest, ExplainConceptRequest, EditMathRequest
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

PROMPT_MAP = {
    "base": "1 главный промпт.md",
    "restore": "2 восстановление_промпт.md",
    "what_is": "3 контекстный_промпт.md",
    "formula": "4 формулы_промпт.md",
    "article": "5 статьи_промпт.md",
    "opposites": "6 противоположности_промпт.md",
    "hint": "7 помощник_промпт.md"
}

def get_cached_prompt(filename: str) -> str:
    prompts_dir = BASE_DIR / "prompts"
    prompt_path = prompts_dir / filename
    if not prompt_path.exists():
        found = False
        if prompts_dir.exists():
            for p in prompts_dir.glob("*.md"):
                if p.name.strip() == filename.strip() or p.name.startswith(filename[:4]):
                    prompt_path = p
                    found = True
                    break
        if not found:
            logger.error(f"Prompt file not found: {filename}")
            raise HTTPException(status_code=500, detail=f"Prompt file {filename} not found.")
    try:
        return prompt_path.read_text(encoding="utf-8")
    except Exception as e:
        logger.error(f"Error reading prompt file {filename}: {e}")
        raise HTTPException(status_code=500, detail="Error reading prompt file.")


def get_bundled_prompt(target_key: str) -> str:
    """
    Семантическая сборка системного промпта из цепочки зависимостей (базовые + модульные промпты).
    """
    bundles = {
        "opposites": ["base", "restore", "opposites"],
        "formula": ["base", "restore", "what_is", "formula"],
        "hint": ["base", "restore", "hint"],
        "article": ["base", "restore", "what_is", "formula", "article"],
        "what_is": ["base", "restore", "what_is"]
    }
    keys = bundles.get(target_key, [target_key])
    texts = [get_cached_prompt(PROMPT_MAP.get(k, k)) for k in keys]
    return "\n\n---\n\n".join(texts)

@router.post("/dialectics/opposites")
async def generate_opposites(
    request: OppositesRequest,
    user: Any = Depends(check_auth_dependency),
    client: AsyncGroq = Depends(get_groq_client)
):
    prompt_template = get_bundled_prompt("opposites")
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
    system_prompt = get_bundled_prompt("formula")
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
        transcription_text = transcription.strip() if isinstance(transcription, str) else str(transcription).strip()

        prompt = (
            "You are an assistant that translates the description of a mathematical formula in natural language strictly into LaTeX format. Output ONLY the LaTeX code, without surrounding quotes, without markdown blocks (```latex) and without any explanations. Your response must be ready to be inserted into the KaTeX renderer.\n\n"
            "CRITICAL RULES & EXAMPLES FOR KATEX:\n"
            "1. OVERBRACE / UNDERBRACE WITH LABELS: When instructed to add a horizontal curly brace over an expression/sum with a label/signature (например: 'фигурная скобка над суммой единиц и подпись N'), you MUST wrap the ENTIRE expression inside \\overbrace{...} and attach the label as a superscript directly to the brace: \\overbrace{expression}^{label}.\n"
            "2. Never place the label before or beside the brace.\n"
            "3. Examples:\n"
            "- Input: сумма пяти единиц, над ними фигурная скобка с буквой N и в конце равно 5\n  Output: \\overbrace{1 + 1 + 1 + 1 + 1}^{N} = 5\n"
            "- Input: фигурная скобка над суммой троек и подпись M\n  Output: \\overbrace{3 + \\dots + 3}^{M}\n"
        )
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Translate to LaTeX: {transcription_text}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=512,
        )
        result = chat_completion.choices[0].message.content.strip()
        if result.startswith("```latex"): result = result[8:]
        if result.startswith("```"): result = result[3:]
        if result.endswith("```"): result = result[:-3]
        return {"latex": result.strip(), "transcribed_text": transcription_text}
    except Exception as e:
        logger.error(f"Error calling Groq Whisper/LLM API: {e}")
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/dialectics/edit-math")
async def edit_math_from_text(
    request: EditMathRequest,
    user: Any = Depends(check_auth_dependency),
    client: AsyncGroq = Depends(get_groq_client)
):
    try:
        prompt = (
            "You are an expert LaTeX assistant. You are given an existing LaTeX mathematical formula and a user's instruction (in Russian or English) describing how to modify or add to this formula. Modify the formula according to the instruction. Output ONLY the resulting valid LaTeX code, without surrounding quotes, without markdown formatting blocks (```latex), and without any explanations or chatter. Your response must be ready to be rendered directly by KaTeX.\n\n"
            "CRITICAL RULES & EXAMPLES FOR KATEX:\n"
            "1. OVERBRACE / UNDERBRACE WITH LABELS: When instructed to add a horizontal curly brace over an expression/sum with a label/signature (например: 'фигурная скобка над суммой единиц и подпись N' или 'добавить над суммой фигурную скобку и подпись N'), you MUST wrap the ENTIRE sum/expression inside \\overbrace{...} and attach the label as a superscript directly to the brace: \\overbrace{expression}^{label}.\n"
            "2. Never place the label before or beside the brace. Do not wrap just a single digit if the instruction says 'над суммой' or 'над выражением'. Wrap the whole sequence.\n"
            "3. Examples:\n"
            "- Current: 1 + 1 + 1\n  Instruction: добавить над суммой фигурную скобку и подпись N\n  Result: \\overbrace{1 + 1 + 1}^{N}\n"
            "- Current: 3 + \\dots + 3 = 2^k\n  Instruction: фигурная скобка над суммой левой части и сверху подпись M\n  Result: \\overbrace{3 + \\dots + 3}^{M} = 2^k\n"
        )
        user_content = f"Current LaTeX formula:\n{request.current_latex}\n\nUser modification instruction:\n{request.instruction}\n\nNew modified LaTeX formula:"
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_content}
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
        logger.error(f"Error calling Groq API for edit-math: {e}")
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/dialectics/edit-voice-math")
async def edit_math_from_voice(
    current_latex: str = Form(...),
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
        transcription_text = transcription.strip() if isinstance(transcription, str) else str(transcription).strip()

        prompt = (
            "You are an expert LaTeX assistant. You are given an existing LaTeX mathematical formula and a user's spoken instruction transcribed from voice describing how to modify or add to this formula. Modify the formula according to the instruction. Output ONLY the resulting valid LaTeX code, without surrounding quotes, without markdown formatting blocks (```latex), and without any explanations or chatter. Your response must be ready to be rendered directly by KaTeX.\n\n"
            "CRITICAL RULES & EXAMPLES FOR KATEX:\n"
            "1. OVERBRACE / UNDERBRACE WITH LABELS: When instructed to add a horizontal curly brace over an expression/sum with a label/signature (например: 'фигурная скобка над суммой единиц и подпись N' или 'добавить над суммой фигурную скобку и подпись N'), you MUST wrap the ENTIRE sum/expression inside \\overbrace{...} and attach the label as a superscript directly to the brace: \\overbrace{expression}^{label}.\n"
            "2. Never place the label before or beside the brace. Do not wrap just a single digit if the instruction says 'над суммой' or 'над выражением'. Wrap the whole sequence.\n"
            "3. Examples:\n"
            "- Current: 1 + 1 + 1\n  Instruction: добавить над суммой фигурную скобку и подпись N\n  Result: \\overbrace{1 + 1 + 1}^{N}\n"
            "- Current: 3 + \\dots + 3 = 2^k\n  Instruction: фигурная скобка над суммой левой части и сверху подпись M\n  Result: \\overbrace{3 + \\dots + 3}^{M} = 2^k\n"
        )
        user_content = f"Current LaTeX formula:\n{current_latex}\n\nUser voice instruction:\n{transcription_text}\n\nNew modified LaTeX formula:"
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_content}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=512,
        )
        result = chat_completion.choices[0].message.content.strip()
        if result.startswith("```latex"): result = result[8:]
        if result.startswith("```"): result = result[3:]
        if result.endswith("```"): result = result[:-3]
        return {"latex": result.strip(), "transcribed_text": transcription_text}
    except Exception as e:
        logger.error(f"Error calling Groq Whisper/LLM API for edit-voice-math: {e}")
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

    step_num = request.step_id.replace("step", "")
    prompt_template = get_bundled_prompt("hint")
    system_prompt = prompt_template.replace("{GOAL}", request.goal_text).replace("{CONTEXT}", request.context_text).replace("{CURRENT_STEP}", step_num)

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
    prompt_template = get_bundled_prompt("article")
    
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
        extracted_text = ""

    if "{ARTICLE_CONTENT}" in prompt_template:
        system_prompt = prompt_template.replace("{ARTICLE_CONTENT}", extracted_text)
    elif extracted_text:
        system_prompt = f"{prompt_template}\n\n--- ТЕКСТ АНАЛИЗИРУЕМОЙ СТАТЬИ ---\n{extracted_text}"
    else:
        system_prompt = prompt_template

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
    system_prompt = get_bundled_prompt("what_is")
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

@router.get("/dialectics/hints")
async def get_dialectics_hints():
    prompts_dir = BASE_DIR / "prompts"
    hints_file = prompts_dir / "8 алгоритм_составления_конспекта.json"
    if not hints_file.exists():
        for p in prompts_dir.glob("*.json"):
            if "алгоритм_составления_конспекта" in p.name:
                hints_file = p
                break
    if not hints_file.exists():
        raise HTTPException(status_code=404, detail="Hints file not found")
    try:
        data = json.loads(hints_file.read_text(encoding="utf-8"))
        return data
    except Exception as e:
        logger.error(f"Error reading hints file: {e}")
        raise HTTPException(status_code=500, detail="Error reading hints file")

