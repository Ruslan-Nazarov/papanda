from groq import AsyncGroq
from fastapi_app.config import settings
import os
from typing import Dict, Optional
import aiofiles

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

class AIService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY, timeout=30.0)
        self.model = "openai/gpt-oss-120b" # Обновлено на актуальную модель
        self._prompts_cache: Dict[str, str] = {}
        
    async def get_bundled_prompt(self, key: str) -> str:
        if key in self._prompts_cache:
            return self._prompts_cache[key]
            
        prompts_dir = settings.PROMPTS_DIR
        chain = PROMPT_CHAINS.get(key, ["base", key])
        
        contents = []
        for p_key in chain:
            filename = PROMPT_MAP.get(p_key)
            if not filename:
                # If key not in map (e.g. fallback), use it as filename pattern
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

    async def _generate(self, system_prompt: str, user_prompt: str, response_format: Optional[dict] = None, history: Optional[list] = None) -> str:
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
            return "AI disabled. Please set GROQ_API_KEY."
            
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_prompt})
        
        try:
            kwargs = {
                "model": self.model,
                "messages": messages
            }
            if response_format:
                kwargs["response_format"] = response_format
                
            response = await self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            return f"Error calling AI: {str(e)}"

    async def get_opposites(self, process_a: str, locale: str = "русском") -> str:
        sys_prompt = await self.get_bundled_prompt("opposites")
        user_prompt = (
            f"Процесс A: {process_a}\n\n"
            f"Найди диалектическую противоположность (процесс B) для данного процесса A.\n"
            f"Объясни, почему именно этот процесс является диалектической противоположностью.\n"
            f"Ответ давай на {locale}."
        )
        return await self._generate(sys_prompt, user_prompt)
        
    async def explain_concept(self, text: str, context_before: str, context_after: str, history: list, locale: str = "русском") -> str:
        sys_prompt = await self.get_bundled_prompt("what_is")
        user_prompt = (
            f"Выделенный фрагмент: \"{text}\"\n\n"
            f"Контекст (до): {context_before}\n\n"
            f"Контекст (после): {context_after}\n\n"
            f"Объясни, что такое \"{text}\" в контексте данного конспекта."
        )
        return await self._generate(sys_prompt, user_prompt, history=history)
        
    async def generate_parser(self, formula: str) -> str:
        sys_prompt = await self.get_bundled_prompt("formula")
        user_prompt = (
            f"Формула: {formula}\n\n"
            f"Разбери эту формулу. Объясни каждый символ и смысл формулы целиком."
        )
        return await self._generate(sys_prompt, user_prompt)

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
        return await self.get_hint(step_id=step_id, goal_text=note_title or "", context_text=current_content, locale=locale, mode=mode)

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
        return await self._generate(sys_prompt, user_prompt)
        
    async def autofill_conspect(self, anchor_text: str, note_title: str, locale: str = "русском") -> str:
        sys_prompt = await self.get_bundled_prompt("hint")
        user_prompt = (
            f"Пользователь начал составлять диалектический конспект.\n"
            f"Тема: {note_title}\n"
            f"Цель изучения (anchor): {anchor_text}\n\n"
            f"Основываясь на Главном промпте и вашей роли помощника, сгенерируйте содержимое для следующих 5 шагов:\n"
            f"step1 - Простейший процесс\n"
            f"step2 - Развитие простейшего процесса\n"
            f"step3 - Противоположный процесс\n"
            f"step4 - Развитие противоположного процесса\n"
            f"step5 - Синтез и противоречие\n\n"
            f"Обязательно верни результат строго в формате JSON, где ключи - это 'step1', 'step2', 'step3', 'step4', 'step5', а значения - сгенерированный текст.\n"
            f"Отвечай на {locale}."
        )
        return await self._generate(sys_prompt, user_prompt, {"type": "json_object"})

    async def generate_next_step(self, context_text: str, target_step: str, locale: str = "русском") -> str:
        sys_prompt = await self.get_bundled_prompt("hint")
        user_prompt = (
            f"Пользователь составляет диалектический конспект шаг за шагом.\n"
            f"Текущий контекст конспекта (уже заполненные шаги):\n{context_text}\n\n"
            f"Основываясь на Главном промпте и вашей роли помощника, сгенерируйте текст ТОЛЬКО для шага: {target_step}.\n"
            f"Обязательно верни результат строго в формате JSON, где ключ - это '{target_step}', а значение - сгенерированный текст для этого шага.\n"
            f"Отвечай на {locale}."
        )
        return await self._generate(sys_prompt, user_prompt, {"type": "json_object"})
    async def check_logic(self, note_text: str, history: list, locale: str = "русском") -> str:
        sys_prompt = await self.get_bundled_prompt("check_ai")
        user_prompt = (
            f"Конспект для проверки:\n---\n{note_text}\n---\n\n"
            f"Проверь логическую связность диалектического конспекта.\n"
            f"Дай структурированную оценку по каждому критерию.\n"
            f"Ответ на {locale}."
        )
        return await self._generate(sys_prompt, user_prompt, history=history)

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
                model="qwen/qwen3.6-27b", # Предполагаем, что эта модель поддерживает vision
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            # Fallback
            try:
                response = await self.client.chat.completions.create(
                    model="openai/gpt-oss-120b",
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
                    model="whisper-large-v3",
                    response_format="json",
                    language="ru",
                    temperature=0.0
                )
                return transcription.text
            else:
                import httpx
                headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
                files = {"file": (os.path.basename(file_path), file_bytes, "audio/webm")}
                data = {"model": "whisper-large-v3", "language": "ru", "temperature": "0.0", "response_format": "json"}
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
