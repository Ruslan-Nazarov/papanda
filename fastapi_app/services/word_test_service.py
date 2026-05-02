import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from .. import models
from ..logger import logger
from .language_service import LanguageService
from .word_stats_service import WordStatsService

class WordTestService:
    """Service for handling word training sessions, random word selection, and test results."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.langs = LanguageService(db)
        self.stats = WordStatsService(db)

    async def get_random_test_words_data(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Prepares data for 'Brain Workout' test session."""
        try:
            # 1. Fetch word pools
            unlearned_pool = await self._get_words_by_status(limit * 2, learned=False)
            learned_pool = await self._get_words_by_status(limit * 2, learned=True)
            
            words = []
            for _ in range(limit):
                # 20% chance to pick a learned word for reinforcement
                if learned_pool and (not unlearned_pool or random.random() < 0.2):
                    words.append(learned_pool.pop(random.randint(0, len(learned_pool) - 1)))
                elif unlearned_pool:
                    words.append(unlearned_pool.pop(random.randint(0, len(unlearned_pool) - 1)))
            
            if not words: return []

            active_langs = await self.langs.get_active_languages()
            result = []

            for w in words:
                # Select random language for testing from available translations
                testable_langs = [
                    l for l in active_langs 
                    if (w.translations and w.translations.get(l)) or 
                       (l == 'en' and w.eng) or
                       (l == 'it' and w.it) or
                       (l == 'de' and w.de)
                ]
                test_lang = random.choice(testable_langs) if testable_langs else active_langs[0]
                
                word_to_test = self._extract_translation(w, test_lang)

                result.append({
                    "eng": w.eng, "ru": w.ru, "it": w.it, "de": w.de,
                    "test_lang": test_lang,
                    "word_to_test": word_to_test,
                    "meaning": w.meaning,
                    "count": w.count,
                    "is_learned": w.is_learned,
                    "translations": w.translations or {}
                })

            # Record that these words were shown
            await self.record_word_shows(words)
            return result
        except Exception as e:
            logger.error(f"Error preparing test data: {e}")
            return []

    async def record_word_shows(self, words: List[models.WordStats]) -> bool:
        """Increments show counts for words and updates dashboard cache metrics."""
        if not words: return True
        now = datetime.now()
        try:
            active_langs = await self.langs.get_active_languages()
            active_langs_for_stats = list(set(active_langs + ['ru', 'en']))

            for w in words:
                w.count += 1
                w.last_shown = now.replace(tzinfo=None)
                stats = dict(w.show_stats or {})
                for lang in active_langs_for_stats:
                    stats[lang] = stats.get(lang, 0) + 1
                w.show_stats = stats
            
            # Update daily global counter
            today = now.date()
            daily_res = await self.db.execute(select(models.WordShowsDaily).where(models.WordShowsDaily.date == today))
            daily_row = daily_res.scalar_one_or_none()
            if daily_row:
                daily_row.shows_count += len(words)
            else:
                self.db.add(models.WordShowsDaily(date=today, shows_count=len(words)))
                
            # Update Dashboard settings cache
            metrics = await self.stats.get_current_metrics(active_langs)
            from .settings_service import set_settings_batch
            await set_settings_batch(self.db, {
                'total_words_count': str(metrics['total_count']),
                'current_coverage_cache': str(metrics['coverage']),
                'current_imw_cache': str(metrics['imw'])
            })

            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error recording word shows: {e}")
            return False

    async def record_test_result(self, is_correct: bool, lang: Optional[str] = None) -> None:
        """Records test success/failure into daily snapshots."""
        from sqlalchemy.orm.attributes import flag_modified
        try:
            today = datetime.now().date()
            res = await self.db.execute(select(models.WordStatsSnapshot).where(models.WordStatsSnapshot.date == today))
            snap = res.scalar_one_or_none()
            
            if not snap:
                active_langs = await self.langs.get_active_languages()
                metrics = await self.stats.get_current_metrics(active_langs)
                snap = models.WordStatsSnapshot(
                    date=today, 
                    coverage=metrics['coverage'], 
                    imw=metrics['imw'],
                    total_count=metrics['total_count'],
                    test_stats_json={}
                )
                self.db.add(snap)
            
            snap.test_total += 1
            if is_correct: snap.test_success += 1
            
            if lang:
                stats = dict(snap.test_stats_json or {})
                lang_data = stats.get(lang, {"total": 0, "success": 0})
                lang_data["total"] += 1
                if is_correct: lang_data["success"] += 1
                stats[lang] = lang_data
                snap.test_stats_json = stats
                flag_modified(snap, "test_stats_json")
            
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error recording test result: {e}")

    async def _get_words_by_status(self, limit: int, learned: bool) -> List[models.WordStats]:
        stmt = select(models.WordStats).where(models.WordStats.is_learned == learned).order_by(func.random()).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    def _extract_translation(self, word: models.WordStats, lang: str) -> str:
        if lang == 'en': return word.eng
        if lang == 'it': return word.it
        if lang == 'de': return word.de
        return (word.translations or {}).get(lang, "") or getattr(word, lang, word.eng)
