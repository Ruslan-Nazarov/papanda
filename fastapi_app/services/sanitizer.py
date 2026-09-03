import re
import json

class Sanitizer:
    @staticmethod
    def extract_json(llm_response: str) -> dict:
        """Извлекает JSON из ответа LLM, даже если он обернут в markdown (```json ... ```)"""
        try:
            # Сначала пробуем распарсить как есть
            return json.loads(llm_response)
        except json.JSONDecodeError:
            # Ищем блок JSON через регулярное выражение
            json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', llm_response, re.DOTALL | re.IGNORECASE)
            if json_match:
                try:
                    return json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    pass
        
        # Попытка вытащить первый встреченный объект {...}
        obj_match = re.search(r'(\{.*\})', llm_response, re.DOTALL)
        if obj_match:
            try:
                return json.loads(obj_match.group(1))
            except json.JSONDecodeError:
                pass

        # Если ничего не помогло, возвращаем ошибку для логирования
        raise ValueError("Failed to extract valid JSON from LLM response.")

    @staticmethod
    def clean_markdown_for_editor(text: str) -> str:
        """
        Возвращаем текст как есть. Фронтенд (AIController) теперь сам парсит 
        Markdown через marked.js в нормальный HTML.
        """
        if not text:
            return ""
        return text.strip()
