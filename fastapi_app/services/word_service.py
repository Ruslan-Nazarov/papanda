from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, or_, delete, text
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Dict, Any, Optional, Union
from datetime import datetime

from .. import models
from ..logger import logger
from .language_service import LanguageService
from .word_stats_service import WordStatsService
from .word_test_service import WordTestService

class WordService:
    """
    Service for word management (CRUD) and dictionary operations.
    Acts as a coordinator for specialized word sub-services.
    """
    
    # Simple search cache
    _search_cache: Dict[str, List[Any]] = {}

    def __init__(self, db: AsyncSession):
        self.db = db
        self.langs = LanguageService(db)
        self.stats = WordStatsService(db)
        self.test = WordTestService(db)

    # --- Search with Cache ---
    async def search_words(self, query: str, limit: int = 10) -> List[models.WordStats]:
        """Searches words by pattern with in-memory caching."""
        query_cleaned = query.strip().lower()
        if not query_cleaned: return []
        
        cache_key = f"{query_cleaned}_{limit}"
        if cache_key in self._search_cache:
            return self._search_cache[cache_key]

        try:
            q = f"%{query_cleaned}%"
            stmt = select(models.WordStats).where(
                or_(
                    models.WordStats.eng.ilike(q),
                    models.WordStats.it.ilike(q),
                    models.WordStats.de.ilike(q),
                    models.WordStats.ru.ilike(q),
                    text("EXISTS (SELECT 1 FROM json_each(translations) WHERE value LIKE :query)")
                )
            ).params(query=q).limit(limit)
            
            result = await self.db.execute(stmt)
            words = list(result.scalars().all())
            
            self._search_cache[cache_key] = words
            return words
        except Exception as e:
            logger.error(f"Error searching words: {e}")
            return []

    # --- Word Management (CRUD) ---
    async def upsert_word_dynamic(self, eng: str, translations: Dict[str, str], meaning: str) -> Optional[models.WordStats]:
        """Creates or updates a word with dynamic translations."""
        try:
            res = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == eng))
            w = res.scalar_one_or_none()
            
            if w:
                w.meaning = meaning
                w.ru = translations.get('ru', w.ru)
                current_trans = dict(w.translations or {})
                current_trans.update(translations)
                w.translations = current_trans
                flag_modified(w, 'translations')
            else:
                w = models.WordStats(
                    word=eng, eng=eng, 
                    ru=translations.get('ru', ''),
                    meaning=meaning, 
                    translations=translations,
                    knowledge_stats={l: False for l in translations.keys()}
                )
                self.db.add(w)
            
            await self.db.commit()
            self._search_cache.clear()
            return w
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error upserting word '{eng}': {e}")
            raise

    async def update_word_full_dynamic(self, word_eng: str, translations: Dict[str, str], meaning: str) -> Optional[models.WordStats]:
        """Update existing word translations and meaning."""
        return await self.upsert_word_dynamic(word_eng, translations, meaning)

    async def delete_word(self, word_eng: str) -> bool:
        """Deletes a word and invalidates cache."""
        try:
            await self.db.execute(delete(models.WordStats).where(models.WordStats.eng == word_eng))
            await self.db.commit()
            self._search_cache.clear()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting word {word_eng}: {e}")
            return False

    async def mark_word_known(self, word_eng: str, lang: str, is_known: bool = True) -> Optional[models.WordStats]:
        """Marks a translation as known and updates learning status."""
        try:
            res = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == word_eng))
            w = res.scalar_one_or_none()
            if w:
                stats = dict(w.knowledge_stats or {})
                stats[lang] = is_known
                w.knowledge_stats = stats
                
                active_langs = await self.langs.get_active_languages()
                w.is_learned = all(stats.get(al) for al in active_langs)
                
                await self.db.commit()
                return w
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error marking word known {word_eng}: {e}")
            return None

    async def toggle_active_triplet_known(self, word_eng: str, is_known: bool = True) -> Optional[models.WordStats]:
        """Toggles known status for all currently active languages for a word."""
        try:
            res = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == word_eng))
            w = res.scalar_one_or_none()
            if w:
                active_langs = await self.langs.get_active_languages()
                k_stats = dict(w.knowledge_stats or {})
                for lang in active_langs:
                    k_stats[lang] = is_known
                w.knowledge_stats = k_stats
                w.is_learned = is_known
                await self.db.commit()
                return w
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error toggling triplet known {word_eng}: {e}")
            return None

    async def reset_all_stats(self) -> bool:
        """Resets all word learning statistics."""
        try:
            await self.db.execute(update(models.WordStats).values({
                models.WordStats.count: 0,
                models.WordStats.is_learned: False,
                models.WordStats.show_stats: {},
                models.WordStats.knowledge_stats: {}
            }))
            await self.db.execute(delete(models.WordStatsSnapshot))
            await self.db.commit()
            self._search_cache.clear()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error resetting stats: {e}")
            return False

    # --- Delegations (Facade) ---
    async def get_active_languages(self): 
        return await self.langs.get_active_languages()
    
    async def get_all_language_names(self):
        return await self.langs.get_all_language_names()

    async def get_all_available_language_codes(self):
        return await self.langs.get_all_available_language_codes()

    async def get_current_metrics(self): 
        active = await self.langs.get_active_languages()
        return await self.stats.get_current_metrics(active)

    async def get_distribution_stats(self):
        active = await self.langs.get_active_languages()
        return await self.stats.get_distribution_stats(active)

    async def get_random_test_words_data(self, limit=5, max_known=1): 
        return await self.test.get_random_test_words_data(limit, max_known)
    
    async def record_test_result(self, correct, lang): 
        await self.test.record_test_result(correct, lang)

    async def get_snapshot_history(self, limit=30):
        return await self.stats.get_snapshot_history(limit)

    async def get_daily_shows_history(self, limit=30):
        return await self.stats.get_daily_shows_history(limit)

    async def get_knowledge_counts(self, languages: List[str]):
        return await self.stats.get_knowledge_counts(languages)

    async def get_fully_learned_count(self, languages: Optional[List[str]] = None):
        if not languages:
            languages = await self.langs.get_active_languages()
        return await self.stats.get_fully_learned_count(languages)
    
    async def save_daily_snapshot(self, date_obj, coverage, imw, total, learned):
        await self.stats.save_daily_snapshot(date_obj, coverage, imw, total, learned)

    async def get_top_encountered_words(self, limit: int = 12) -> List[models.WordStats]:
        active_langs = await self.langs.get_active_languages()
        sum_expr = " + ".join([f"COALESCE(JSON_EXTRACT(show_stats, '$.{l}'), 0)" for l in active_langs])
        stmt = select(models.WordStats).order_by(text(f"({sum_expr}) DESC")).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    def get_sentences_json(self) -> str:
        from ..config import settings
        import os
        path = settings.resources_dir / "sentence.json"
        try:
            with open(path, 'r', encoding='utf-8') as f: return f.read()
        except: return "[]"
