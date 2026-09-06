from groq import AsyncGroq
from fastapi_app.config import settings
import os
import time
import json
import hashlib
from contextlib import aclosing
from collections import OrderedDict
from typing import Dict, Optional
import aiofiles


class _TTLCache:
    """Маленький LRU+TTL кэш ответов LLM (общий на процесс)."""

    def __init__(self, maxsize: int = 256, ttl: float = 3600.0):
        self.maxsize = maxsize
        self.ttl = ttl
        self._d: "OrderedDict[str, tuple]" = OrderedDict()

    @staticmethod
    def key(*parts) -> str:
        raw = json.dumps(parts, ensure_ascii=False, sort_keys=True, default=str)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, key: str):
        item = self._d.get(key)
        if item is None:
            return None
        ts, value = item
        if time.time() - ts > self.ttl:
            self._d.pop(key, None)
            return None
        self._d.move_to_end(key)
        return value

    def set(self, key: str, value: str) -> None:
        self._d[key] = (time.time(), value)
        self._d.move_to_end(key)
        while len(self._d) > self.maxsize:
            self._d.popitem(last=False)


_llm_cache = _TTLCache()

PROMPT_MAP = {
    "base":      "1_главный_промпт.md",
    "restore":   "2_восстановление_промпт.md",
    "what_is":   "3_контекст.md",
    "formula":   "4_формулы_промпт.md",
    "article":   "5_статьи_промпт.md",
    "check_ai":  "6_проверка_промпт.md",
    "format_short": "формат_кратко.md",
    "format_check": "формат_отчета_проверки.md",
}

# restore (2_восстановление) осталось только в what_is: 4_формулы и 5_статьи
# несут свою процедуру восстановления к диалектике внутри себя, 3_контекст
# явно на restore ссылается (п.2).
PROMPT_CHAINS = {
    "formula": ["base", "formula", "format_short"],
    "article": ["base", "formula", "article", "format_short"],
    "what_is": ["base", "restore", "what_is", "format_short"],
    "check_ai": ["base", "check_ai", "format_check"],
}

from fastapi_app.services.llm_provider import llm_registry, any_llm_key_configured
from fastapi_app.services.skills import render_skill_instructions

_AI_DISABLED_MSG = "AI disabled: не настроены API-ключи LLM (см. .env)."

class AIService:
    def __init__(self):
        self._prompts_cache: Dict[str, str] = {}
        self._groq_client: Optional[AsyncGroq] = None

    @property
    def client(self) -> AsyncGroq:
        """Ленивая инициализация Groq-клиента для vision/whisper (OCR, транскрипция)."""
        if self._groq_client is None:
            self._groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY or "dummy_key")
        return self._groq_client

    @client.setter
    def client(self, value):
        self._groq_client = value

    async def get_bundled_prompt(self, key: str) -> str:
        if key in self._prompts_cache:
            return self._prompts_cache[key]
            
        prompts_dir = settings.PROMPTS_DIR
        chain = PROMPT_CHAINS.get(key, ["base", key])
        
        contents = []
        for p_key in chain:
            filename = PROMPT_MAP.get(p_key)
            if not filename:
                filename = f"{p_key}.md"
            
            file_path = prompts_dir / filename
            if file_path.exists():
                async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
                    contents.append(await f.read())
            else:
                contents.append(f"Instruction for {p_key}")
                
        bundled = "\n\n---\n\n".join(contents)
        self._prompts_cache[key] = bundled
        return bundled

    async def _generate(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[dict] = None,
        history: Optional[list] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        fast: bool = False,
        use_cache: bool = True,
        prefer: Optional[str] = None,
    ) -> str:
        if not any_llm_key_configured():
            return _AI_DISABLED_MSG

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_prompt})

        cache_key = None
        if use_cache:
            cache_key = _llm_cache.key(messages, response_format, max_tokens, temperature, fast)
            hit = _llm_cache.get(cache_key)
            if hit is not None:
                return hit

        try:
            result = await llm_registry.generate(
                messages,
                response_format,
                max_tokens=max_tokens,
                temperature=temperature,
                fast=fast,
                prefer=prefer,
            )
        except Exception as e:
            return f"Error calling AI: {str(e)}"

        if cache_key and result and not result.startswith("Error calling AI:"):
            _llm_cache.set(cache_key, result)
        return result

    async def _generate_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        history: Optional[list] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        fast: bool = False,
        use_cache: bool = True,
        prefer: Optional[str] = None,
    ):
        """Стрим токенов ответа. При попадании в кэш отдаёт целиком одним чанком.
        По завершении складывает полный ответ в кэш."""
        if not any_llm_key_configured():
            yield _AI_DISABLED_MSG
            return

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_prompt})

        cache_key = None
        if use_cache:
            cache_key = _llm_cache.key(messages, None, max_tokens, temperature, fast)
            hit = _llm_cache.get(cache_key)
            if hit is not None:
                yield hit
                return

        parts = []
        async with aclosing(llm_registry.generate_stream(
            messages, max_tokens=max_tokens, temperature=temperature, fast=fast, prefer=prefer
        )) as gen:
            async for delta in gen:
                parts.append(delta)
                yield delta

        full = "".join(parts).strip()
        if cache_key and full:
            _llm_cache.set(cache_key, full)

    def _explain_prompt(self, text, context_before, context_after, skill=None):
        return (
            f"Выделенный фрагмент: \"{text}\"\n\n"
            f"Контекст (до): {context_before}\n\n"
            f"Контекст (после): {context_after}\n\n"
            f"Объясни, что такое \"{text}\" в контексте данного конспекта. "
            f"Если у фрагмента есть внятный исторический путь (как к нему пришли) — "
            f"коротко покажи его, затем логическое объяснение (п. 3.1 промпта восстановления)."
            + render_skill_instructions(skill)
        )

    async def explain_concept(self, text: str, context_before: str, context_after: str, history: list, locale: str = "русском", skill: dict = None) -> str:
        sys_prompt = await self.get_bundled_prompt("what_is")
        user_prompt = self._explain_prompt(text, context_before, context_after, skill)
        return await self._generate(sys_prompt, user_prompt, history=history, fast=True, max_tokens=800)

    async def explain_concept_stream(self, text, context_before, context_after, history, locale="русском", skill: dict = None):
        sys_prompt = await self.get_bundled_prompt("what_is")
        user_prompt = self._explain_prompt(text, context_before, context_after, skill)
        async with aclosing(self._generate_stream(sys_prompt, user_prompt, history=history, fast=True, max_tokens=800)) as g:
            async for d in g:
                yield d

    async def generate_parser(self, formula: str) -> str:
        sys_prompt = await self.get_bundled_prompt("formula")
        user_prompt = (
            f"Формула: {formula}\n\n"
            f"Постройте диалектическую цепочку от суммирования к этой формуле. "
            f"Для каждого звена: операция-предшественник → кризис записи/вычисления → "
            f"операция, разрешающая кризис. Только количественный анализ, без физического "
            f"или содержательного смысла символов. Формат ответа — Markdown."
        )
        return await self._generate(sys_prompt, user_prompt)

    async def parse_article(self, text: str, user_instruction: str = "", skill: dict = None) -> str:
        sys_prompt = await self.get_bundled_prompt("article")
        instr = (user_instruction or "").strip()
        user_prompt = (
            f"{instr}\n\n" if instr and "диалектич" not in instr.lower() else ""
        ) + (
            f"Текст статьи:\n---\n{text}\n---\n\n"
            "Уберите академический шум, выделите простейший процесс, покажите его "
            "развитие через противоположность к синтезу. Ответ — связный Markdown "
            "(заголовки, короткие абзацы), без JSON, ТРЕМЯ разделами:\n"
            "## Историческая форма — как процесс из статьи разворачивался в реальной "
            "истории предмета (п. 3.1 промпта статей).\n"
            "## Логическая форма — тот же процесс строго по алгоритму диалектического "
            "анализа; приоритет — соответствие алгоритму, а не факты (п. 3.2).\n"
            "## Расхождение — где логическая форма расходится с исторической и почему; "
            "как содержание статьи повлияло на дальнейшее развитие предмета (п. 4)."
            + render_skill_instructions(skill)
        )
        return await self._generate(sys_prompt, user_prompt)

    @staticmethod
    def _check_prompt(note_text, locale):
        return (
            f"Конспект для проверки:\n---\n{note_text}\n---\n\n"
            f"Проверь логическую связность диалектического конспекта.\n"
            f"Дай структурированную оценку по каждому критерию.\n"
            f"Ответ на {locale}."
        )

    async def check_logic(self, note_text: str, history: list, locale: str = "русском") -> str:
        sys_prompt = await self.get_bundled_prompt("check_ai")
        return await self._generate(sys_prompt, self._check_prompt(note_text, locale), history=history)

    async def check_logic_stream(self, note_text: str, history: list, locale: str = "русском"):
        sys_prompt = await self.get_bundled_prompt("check_ai")
        async with aclosing(self._generate_stream(sys_prompt, self._check_prompt(note_text, locale), history=history, max_tokens=1600)) as g:
            async for d in g:
                yield d

    async def edit_math(self, instruction: str, formula: str) -> str:
        sys_prompt = (
            "Ты — редактор математических формул в LaTeX. По инструкции пользователя "
            "верни ТОЛЬКО итоговую формулу в LaTeX, без пояснений. "
            'Формат ответа строго JSON: {"formula": "…"}.'
        )
        user_prompt = (
            f"Исходная формула (LaTeX): {formula or '(пусто)'}\n\n"
            f"Инструкция: {instruction}"
        )
        return await self._generate(sys_prompt, user_prompt, {"type": "json_object"})

    async def text_to_formula(self, description: str) -> str:
        sys_prompt = (
            "Ты преобразуешь словесное описание в математическую формулу LaTeX. "
            'Верни ТОЛЬКО формулу в LaTeX, строго JSON: {"formula": "…"}. Без пояснений.'
        )
        user_prompt = f"Описание: {description}"
        return await self._generate(sys_prompt, user_prompt, {"type": "json_object"})

    async def ocr_formula(self, base64_img: str) -> str:
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
            return "AI disabled."
            
        sys_prompt = (
            "Ты распознаёшь математические формулы с изображений. "
            'Верни ТОЛЬКО распознанную формулу в LaTeX, строго JSON: {"formula": "…"}.'
        )
        user_prompt = "Распознай формулу с изображения и верни в формате JSON."
        
        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": [
                {"type": "text", "text": user_prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}
            ]}
        ]
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.GROQ_VISION_MODEL,
                messages=messages
            )
            return response.choices[0].message.content
        except Exception:
            # Fallback на запасную vision-модель
            try:
                response = await self.client.chat.completions.create(
                    model=settings.GROQ_VISION_FALLBACK_MODEL,
                    messages=messages
                )
                return response.choices[0].message.content
            except Exception as e2:
                return f"Error calling AI Vision: {str(e2)}"

    async def transcribe_audio(self, file_path: str) -> str:
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
            return "Audio transcription disabled."
        try:
            with open(file_path, "rb") as file:
                file_bytes = file.read()

            if hasattr(self.client, "audio") and hasattr(self.client.audio, "transcriptions"):
                transcription = await self.client.audio.transcriptions.create(
                    file=(os.path.basename(file_path), file_bytes),
                    model=settings.GROQ_WHISPER_MODEL,
                    response_format="json",
                    language="ru",
                    temperature=0.0
                )
                return transcription.text
            else:
                import httpx
                headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
                files = {"file": (os.path.basename(file_path), file_bytes, "audio/webm")}
                data = {"model": settings.GROQ_WHISPER_MODEL, "language": "ru", "temperature": "0.0", "response_format": "json"}
                async with httpx.AsyncClient() as http_client:
                    resp = await http_client.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers=headers,
                        files=files,
                        data=data
                    )
                    resp_json = resp.json()
                    return resp_json.get("text", "")
        except Exception as e:
            return f"Error transcribing audio: {str(e)}"

ai_service = AIService()

