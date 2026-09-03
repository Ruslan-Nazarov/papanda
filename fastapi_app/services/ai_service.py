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
    "base":      "1 главный промпт.md",
    "restore":   "2 восстановление_промпт.md",
    "what_is":   "3 контекстный_промпт.md",
    "formula":   "4 формулы_промпт.md",
    "article":   "5 статьи_промпт.md",
    "opposites": "6 противоположности_промпт.md",
    "hint":      "7 помощник_промпт.md",
    "check_ai":  "9 проверка_промпт.md",
}

PROMPT_CHAINS = {
    "opposites": ["base", "restore", "opposites"],
    "formula": ["base", "restore", "what_is", "formula"],
    "hint": ["base", "restore", "hint"],
    "article": ["base", "restore", "what_is", "formula", "article"],
    "what_is": ["base", "restore", "what_is"],
    "check_ai": ["base", "restore", "check_ai"],
}

from fastapi_app.services.llm_provider import llm_registry, any_llm_key_configured

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
            messages, max_tokens=max_tokens, temperature=temperature, fast=fast
        )) as gen:
            async for delta in gen:
                parts.append(delta)
                yield delta

        full = "".join(parts).strip()
        if cache_key and full:
            _llm_cache.set(cache_key, full)

    async def get_opposites(self, process_a: str, locale: str = "русском") -> str:
        sys_prompt = await self.get_bundled_prompt("opposites")
        user_prompt = (
            f"Процесс A: {process_a}\n\n"
            f"Найди диалектическую противоположность (процесс B) для данного процесса A.\n"
            f"Объясни, почему именно этот процесс является диалектической противоположностью.\n"
            f"Ответ давай на {locale}."
        )
        return await self._generate(sys_prompt, user_prompt, fast=True, max_tokens=800)
        
    def _explain_prompt(self, text, context_before, context_after):
        return (
            f"Выделенный фрагмент: \"{text}\"\n\n"
            f"Контекст (до): {context_before}\n\n"
            f"Контекст (после): {context_after}\n\n"
            f"Объясни, что такое \"{text}\" в контексте данного конспекта."
        )

    async def explain_concept(self, text: str, context_before: str, context_after: str, history: list, locale: str = "русском") -> str:
        sys_prompt = await self.get_bundled_prompt("what_is")
        user_prompt = self._explain_prompt(text, context_before, context_after)
        return await self._generate(sys_prompt, user_prompt, history=history, fast=True, max_tokens=800)

    async def explain_concept_stream(self, text, context_before, context_after, history, locale="русском"):
        sys_prompt = await self.get_bundled_prompt("what_is")
        user_prompt = self._explain_prompt(text, context_before, context_after)
        async with aclosing(self._generate_stream(sys_prompt, user_prompt, history=history, fast=True, max_tokens=800)) as g:
            async for d in g:
                yield d
        
    async def generate_parser(self, formula: str) -> str:
        sys_prompt = await self.get_bundled_prompt("formula")
        user_prompt = (
            f"Формула: {formula}\n\n"
            f"Разбери эту формулу. Объясни каждый символ и смысл формулы целиком."
        )
        return await self._generate(sys_prompt, user_prompt, {"type": "json_object"})

    async def parse_article(self, text: str, user_instruction: str = "") -> str:
        sys_prompt = await self.get_bundled_prompt("article")
        user_prompt = (
            f"{user_instruction}\n\n"
            f"Текст для парсинга:\n---\n{text}\n---\n\n"
            f"Преобразуй этот текст в структурированные блоки конспекта.\n"
            f"Верни строго JSON-массив, без пояснений и обёрток."
        )
        return await self._generate(sys_prompt, user_prompt, {"type": "json_object"})
        
    async def generate_dialectics_hint(self, step_id: str, current_content: str, note_title: Optional[str] = "", locale: str = "русском", mode: str = "hint") -> str:
        kwargs = {
            "step_id": step_id,
            "goal_text": note_title or "",
            "context_text": current_content,
            "locale": locale
        }
        if mode != "hint":
            kwargs["mode"] = mode
        return await self.get_hint(**kwargs)

    async def get_hint(self, step_id: str, goal_text: str, context_text: str, locale: str = "русском", mode: str = "hint") -> str:
        if step_id == "restore":
            sys_prompt = await self.get_bundled_prompt("restore")
            user_prompt = (
                f"Заголовок блока: {goal_text}\n\n"
                f"Контекст соседних блоков:\n{context_text}\n\n"
                f"Восстанови или дополни содержимое этого блока.\n"
                f"Ответь только текстом блока, без дополнительных пояснений."
            )
        else:
            sys_prompt = await self.get_bundled_prompt("hint")
            if mode == "example":
                user_prompt = (
                    f"Шаг: {step_id}\n"
                    f"Цель пользователя: {goal_text}\n\n"
                    f"Текущее состояние конспекта:\n{context_text}\n\n"
                    f"Сгенерируй пример готового текста, которым можно заполнить этот шаг. Выдай только сам текст без пояснений.\n"
                    f"Ответ на {locale}."
                )
            else:
                user_prompt = (
                    f"Шаг: {step_id}\n"
                    f"Цель пользователя: {goal_text}\n\n"
                    f"Текущее состояние конспекта:\n{context_text}\n\n"
                    f"Дай подсказку, как самому найти ответ для этого шага. Направь пользователя, задай наводящие вопросы.\n"
                    f"Ответ на {locale}."
                )
        # 'restore' — качество важнее (полноценный анализ), остальные подсказки — быстрая модель.
        use_fast = step_id != "restore"
        return await self._generate(sys_prompt, user_prompt, fast=use_fast, max_tokens=900)

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
        sys_prompt = await self.get_bundled_prompt("formula")
        user_prompt = (
            f"Исходная формула: {formula}\n\n"
            f"Инструкция: {instruction}\n\n"
            f"Отредактируй формулу и верни в формате JSON."
        )
        return await self._generate(sys_prompt, user_prompt, {"type": "json_object"})

    async def ocr_formula(self, base64_img: str) -> str:
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
            return "AI disabled."
            
        sys_prompt = await self.get_bundled_prompt("formula")
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

