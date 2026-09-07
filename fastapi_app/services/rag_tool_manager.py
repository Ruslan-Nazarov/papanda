"""Заземление генерации на реальные факты (RAG-as-grounding).

Перед сборкой конспекта тянем короткую справку по теме из ru.wikipedia и
подкладываем её в промпт как справочный контекст — модель опирается на
реальные даты/имена и заметно меньше выдумывает (особенно важно с
историко-первым разбором). Это НЕ пост-проверка фактов: дешевле и ловит
ошибку в источнике, а не после показа.

Один HTTP-запрос на тему, кэш в памяти на час, fail-open (нет вики — генерим
без неё). Хост фиксирован (ru.wikipedia.org), редиректы не следуем.
"""
import time
import logging

import httpx

logger = logging.getLogger(__name__)

_WIKI_API = "https://ru.wikipedia.org/w/api.php"
# ~3500 ≈ вводный абзац + начало первой содержательной секции: даёт не только
# определение, но и контекст (кто, когда, при какой задаче) — то, что нужно
# для историко-первого разбора. Меньше давало голое определение.
_MAX_CHARS = 3500
_CACHE_TTL = 3600.0
# Вопросные обёртки убираем перед поиском статьи: «почему хлеб черствеет» плохо
# резолвится, а «хлеб черствеет» — терпимо (хотя часто всё равно нет статьи, и
# это ок: заземляем только там, где тема = внятное понятие).
_Q_PREFIXES = (
    "почему ", "как ", "что такое ", "что за ", "зачем ", "откуда ", "каким образом ",
    "в чём ", "в чем ", "чем ", "какая ", "какой ", "какое ", "сколько ", "когда ",
)


class RAGManager:
    def __init__(self, ai_service):
        self.ai_service = ai_service
        self._cache: dict[str, tuple[float, str]] = {}

    async def reference_for(self, topic: str) -> str:
        """Справка по теме из ru.wikipedia для заземления фактов. Пусто, если
        не нашлось или ошибка."""
        topic = (topic or "").strip()
        if not topic or len(topic) > 300:
            return ""
        key = topic.lower()
        hit = self._cache.get(key)
        if hit and time.time() - hit[0] < _CACHE_TTL:
            return hit[1]
        text = await self._fetch_wiki(topic)
        self._cache[key] = (time.time(), text)
        return text

    @staticmethod
    def _search_terms(topic: str) -> str:
        t = topic.lower().strip().rstrip("?.!")
        for p in _Q_PREFIXES:
            if t.startswith(p):
                t = t[len(p):]
                break
        return t.strip()

    @classmethod
    async def _fetch_wiki(cls, topic: str) -> str:
        query = cls._search_terms(topic)
        if not query:
            return ""
        headers = {"User-Agent": "papanda/1.0 (conspect generator; https://papanda.kz)"}
        try:
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=False, headers=headers) as client:
                # 1. Резолвим название статьи по префиксу/названию (строго — не
                #    полнотекст, чтобы не подцепить тангенциальную статью).
                r = await client.get(_WIKI_API, params={
                    "action": "opensearch", "search": query, "limit": "1",
                    "namespace": "0", "format": "json",
                })
                r.raise_for_status()
                arr = r.json()
                titles = arr[1] if isinstance(arr, list) and len(arr) > 1 else []
                if not titles:
                    return ""
                title = titles[0]

                # 2. Вводный абзац + начало статьи (без exintro — нужен контекст,
                #    не только определение из лида).
                r2 = await client.get(_WIKI_API, params={
                    "action": "query", "titles": title, "redirects": "1",
                    "prop": "extracts", "explaintext": "1",
                    "exchars": str(_MAX_CHARS), "format": "json",
                })
                r2.raise_for_status()
                pages = (r2.json().get("query", {}) or {}).get("pages", {}) or {}
        except Exception as e:  # noqa: BLE001 — fail-open
            logger.warning("RAG wiki fetch failed for %r: %s", topic, e)
            return ""

        for page in pages.values():
            extract = (page.get("extract") or "").strip()
            if len(extract) >= 80:
                return f"«{page.get('title', title)}» (ru.wikipedia):\n{extract}"
        return ""

    # Совместимость со старыми вызовами в ai_router_service — no-op-проходка,
    # реальное обогащение теперь через reference_for + context_builder.
    def enrich_prompt_if_needed(self, base_prompt: str, action: str, user_prompt: str = None) -> str:
        return base_prompt
