"""RAG-обогащение промптов внешними знаниями.

Пока это заглушка: `enrich_prompt_if_needed` возвращает промпт без изменений.
Когда появится векторная база / веб-поиск — точка расширения здесь.
"""


class RAGManager:
    def __init__(self, ai_service):
        self.ai_service = ai_service

    def enrich_prompt_if_needed(self, base_prompt: str, action: str, user_prompt: str = None) -> str:
        # TODO: подключить внешние источники (веб-поиск / векторная база).
        return base_prompt
