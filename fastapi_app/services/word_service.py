from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, or_, delete
from .. import models

from datetime import datetime

from ..logger import logger

class WordService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def mark_word_known(self, word_eng: str, lang: str, is_known: bool = True):
        try:
            # Используем update() для надежности в асинхронной среде
            # Сопоставляем код языка с именем колонки в БД (для английского eng -> en)
            db_lang = "en" if lang == "eng" else lang
            field_name = f"is_known_{db_lang}"
            
            stmt = update(models.WordStats).where(models.WordStats.eng == word_eng).values({
                field_name: is_known
            })
            await self.db.execute(stmt)
            await self.db.commit()

            # Получаем обновленный объект
            result = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == word_eng))
            return result.scalar_one_or_none()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error marking word known {word_eng}: {e}")
            raise

    async def update_word_full(self, word_eng: str, it: str, de: str, ru: str, meaning: str):
        try:
            result = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == word_eng))
            w = result.scalar_one_or_none()
            if w:
                w.it = it
                w.de = de
                w.ru = ru
                w.meaning = meaning
                await self.db.commit()
                return w
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating word full {word_eng}: {e}")
            raise
    
    async def search_words(self, query: str, limit: int = 10):
        try:
            q = f"%{query.strip()}%"
            stmt = select(models.WordStats).where(
                or_(
                    models.WordStats.eng.ilike(q),
                    models.WordStats.it.ilike(q),
                    models.WordStats.de.ilike(q),
                    models.WordStats.ru.ilike(q),
                )
            ).limit(limit)
            result = await self.db.execute(stmt)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching words by query '{query}': {e}")
            raise
    
    async def upsert_word(self, eng: str, it: str, de: str, ru: str, meaning: str):
        try:
            res = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == eng))
            w = res.scalar_one_or_none()
            if w:
                w.it = it
                w.de = de
                w.ru = ru
                w.meaning = meaning
                await self.db.commit()
                return w
            self.db.add(models.WordStats(word=eng, eng=eng, it=it, de=de, ru=ru, meaning=meaning))
            await self.db.commit()
            res2 = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == eng))
            return res2.scalar_one_or_none()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error upserting word '{eng}': {e}")
            raise

    async def get_random_words(self, limit: int):
        try:
            # Brain Workout показывает рандомно все слова, 
            # кроме тех, что помечены как выученные (is_learned == True).
            stmt = select(models.WordStats).where(
                models.WordStats.is_learned == False
            ).order_by(func.random()).limit(limit)
            
            result = await self.db.execute(stmt)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching test words: {e}")
            raise

    async def record_word_shows(self, words: list):
        """Регистрирует показы для списка слов (инкремент счетчиков и обновление кэша)."""
        if not words: return
        
        now = datetime.now()
        today = now.date()
        
        try:
            for w in words:
                w.count += 1
                w.last_shown = now
            
            # Обновляем WordShowsDaily
            daily_res = await self.db.execute(
                select(models.WordShowsDaily).where(models.WordShowsDaily.date == today)
            )
            daily_row = daily_res.scalar_one_or_none()
            if daily_row:
                daily_row.shows_count += len(words)
            else:
                self.db.add(models.WordShowsDaily(date=today, shows_count=len(words)))
                
            # Пересчитываем метрики для кэша Dashboard
            total_count_res = await self.db.execute(select(func.count(models.WordStats.word)))
            total_count = total_count_res.scalar() or 0

            learned_count_res = await self.db.execute(
                select(func.count(models.WordStats.word)).where(models.WordStats.count > 0)
            )
            learned_count = learned_count_res.scalar() or 0

            total_shows_res = await self.db.execute(select(func.sum(models.WordStats.count)))
            total_shows = total_shows_res.scalar() or 0

            coverage = round((learned_count / total_count) * 100, 2) if total_count > 0 else 0
            target_shows = total_count * 80
            imw = round((total_shows / target_shows) * 100, 2) if target_shows > 0 else 0

            # Сохраняем обновленные метрики в настройки (кэш Dashboard)
            from .settings_service import set_settings_batch
            await set_settings_batch(self.db, {
                'total_words_count': str(total_count),
                'current_coverage_cache': str(coverage),
                'current_imw_cache': str(imw)
            })

            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error recording word shows: {e}")
            return False



    async def reset_all_stats(self):
        try:
            await self.db.execute(update(models.WordStats).values({
                models.WordStats.count: 0,
                models.WordStats.is_known_en: False,
                models.WordStats.is_known_it: False,
                models.WordStats.is_known_de: False,
                models.WordStats.is_learned: False,
            }))
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error resetting all stats: {e}")
            return False

    async def toggle_triplet_learned(self, word_eng: str, is_learned: bool = True):
        """Помечает всю тройку слов как выученную."""
        try:
            stmt = update(models.WordStats).where(models.WordStats.word == word_eng).values(
                is_learned=is_learned
            )
            await self.db.execute(stmt)
            await self.db.commit()
            
            result = await self.db.execute(select(models.WordStats).where(models.WordStats.word == word_eng))
            return result.scalar_one_or_none()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error toggling triplet learned {word_eng}: {e}")
            raise

    async def delete_word(self, word_eng: str):
        """Удаляет слово из базы данных."""
        try:
            stmt = delete(models.WordStats).where(models.WordStats.eng == word_eng)
            await self.db.execute(stmt)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting word {word_eng}: {e}")
            raise
