import json
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, text
from .. import models
from .settings_service import get_setting, set_settings_batch
from ..logger import logger

_state_locks: Dict[asyncio.AbstractEventLoop, asyncio.Lock] = {}

def _get_state_lock() -> asyncio.Lock:
    """Лази-инициализация лока, привязанного к текущему циклу событий."""
    loop = asyncio.get_running_loop()
    if loop not in _state_locks:
        _state_locks[loop] = asyncio.Lock()
    return _state_locks[loop]

class ContextService:
    """Сервис для управления рантайм-контекстом приложения (случайные слова, винки, кэш)."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_runtime_context(self, force_update: bool = False) -> Dict[str, Any]:
        """
        Получает текущий контекст из кэша БД или генерирует новый.
        Гарантирует атомарность обновления через asyncio.Lock.
        """
        async with _get_state_lock():
            interval = int(await get_setting(self.db, 'max_random_minutes', '60'))
            last_update_str = await get_setting(self.db, 'last_update_ts', None)

            need_update = force_update
            now = datetime.now(timezone.utc)

            if not need_update:
                current_words_json = await get_setting(self.db, 'current_words_cache', None)
                if not last_update_str or not current_words_json:
                    need_update = True
                else:
                    try:
                        last_dt = datetime.fromisoformat(last_update_str)
                        if last_dt.tzinfo is None: last_dt = last_dt.replace(tzinfo=timezone.utc)
                        diff = (now - last_dt).total_seconds() / 60
                        if diff >= interval:
                            need_update = True
                    except Exception as e:
                        logger.warning(f"Time parsing failed: {e}")
                        need_update = True

            if not need_update:
                try:
                    words_str = await get_setting(self.db, 'current_words_cache', '[]')
                    words = json.loads(words_str if words_str else '[]')
                    wink = await get_setting(self.db, 'current_wink_cache', '...')
                    count = int(await get_setting(self.db, 'total_words_count', '0'))
                    imw = float(await get_setting(self.db, 'current_imw_cache', '0'))
                    coverage = float(await get_setting(self.db, 'current_coverage_cache', '100.0'))
                    return {'words': words, 'wink': wink, 'count': count, 'coverage': coverage, 'imw': imw}
                except Exception as e:
                    logger.warning(f"Cache read failed: {e}")
                    need_update = True

            return await self._update_runtime_context_from_db()

    async def _update_runtime_context_from_db(self) -> Dict[str, Any]:
        """Генерирует новые данные из БД и сохраняет в кэш."""
        db = self.db
        now = datetime.now(timezone.utc)
        final_words: List[Dict[str, Any]] = []
        coverage, imw, total_count = 0.0, 0.0, 0
        try:
            from ..services.word_service import WordService
            word_service = WordService(db)
            metrics = await word_service.get_current_metrics()
            
            total_count = metrics['total_count']
            coverage = metrics['coverage']
            imw = metrics['imw']

            active_langs = await word_service.get_active_languages()
            lang_conditions = [
                text(f"JSON_EXTRACT(knowledge_stats, '$.{lang}') IS NOT 1") 
                for lang in active_langs
            ]
            
            stmt = select(models.WordStats).where(
                or_(*lang_conditions),
                models.WordStats.is_learned == False
            ).order_by(func.random()).limit(3)
            
            selected_res = await db.execute(stmt)
            selected = selected_res.scalars().all()
            
            active_langs_raw = await get_setting(db, 'active_languages', 'en,it,de')
            active_langs_list = [l.strip() for l in (active_langs_raw or 'en,it,de').split(',') if l.strip()]
            
            final_words = []
            for w in selected:
                word_data = {
                    'eng': w.eng, 
                    'ru': w.ru, 
                    'meaning': w.meaning, 
                    'is_learned': w.is_learned,
                    'translations': w.translations or {}
                }
                word_data['it'] = w.it
                word_data['de'] = w.de
                final_words.append(word_data)

            for w in selected:
                w.count += 1
                w.last_shown = now.replace(tzinfo=None)
                stats = dict(w.show_stats or {})
                for lang in active_langs_list:
                    stats[lang] = stats.get(lang, 0) + 1
                if 'en' not in stats: stats['en'] = stats.get('en', 0) + 1
                if 'ru' not in stats: stats['ru'] = stats.get('ru', 0) + 1
                w.show_stats = stats

            today_date = now.date()
            daily_res = await db.execute(
                select(models.WordShowsDaily).where(models.WordShowsDaily.date == today_date)
            )
            daily_row = daily_res.scalar_one_or_none()
            if daily_row:
                daily_row.shows_count += len(selected)
            else:
                db.add(models.WordShowsDaily(date=today_date, shows_count=len(selected)))

            await db.commit()
        except Exception as e:
            logger.error(f"Metrics/Word Selection failed: {e}")
            await db.rollback()

        try:
            wink_res = await db.execute(select(models.Wink).order_by(func.random()).limit(1))
            wink_obj = wink_res.scalar_one_or_none()
            wink_title = wink_obj.title if wink_obj else "..."
        except Exception as e:
            logger.warning(f"Wink selection failed: {e}")
            wink_title = "..."

        await set_settings_batch(db, {
            'current_words_cache': json.dumps(final_words, ensure_ascii=False),
            'current_wink_cache': wink_title,
            'total_words_count': str(total_count),
            'current_coverage_cache': str(coverage),
            'current_imw_cache': str(imw),
            'last_update_ts': now.isoformat()
        })

        return {'words': final_words, 'wink': wink_title, 'count': total_count, 'coverage': coverage, 'imw': imw}

    async def remove_word_from_cache(self, eng: str) -> None:
        """Удаляет слово из кэша текущих слов (например, когда оно выучено)."""
        async with _get_state_lock():
            words_str = await get_setting(self.db, 'current_words_cache', '[]')
            try:
                words = json.loads(words_str if words_str else '[]')
                new_words = [w for w in words if w.get('eng') != eng]
                await set_settings_batch(self.db, {
                    'current_words_cache': json.dumps(new_words, ensure_ascii=False)
                })
            except Exception as e:
                logger.error(f"Failed to remove word from cache: {e}")
