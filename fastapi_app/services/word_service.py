from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, or_, delete, text
from .. import models
from .settings_service import get_setting
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Set, Tuple, Union

import random
from ..logger import logger

class WordService:
    """Сервис для работы со словарем и статистикой знаний слов."""
    
    def __init__(self, db: AsyncSession):
        """
        Инициализирует сервис.
        
        Args:
            db: Асинхронная сессия SQLAlchemy.
        """
        self.db = db

    async def get_all_available_language_codes(self) -> List[str]:
        """
        Сканирует базу данных и возвращает все уникальные коды языков из JSON поля translations.
        
        Returns:
            List[str]: Список кодов языков (en, it, de, ru, etc.).
        """
        try:
            # Пытаемся извлечь ключи из JSON поля
            stmt = select(models.WordStats.translations).where(models.WordStats.translations.is_not(None)).limit(1000)
            res = await self.db.execute(stmt)
            all_keys: Set[str] = set()
            for row in res.scalars().all():
                if row:
                    all_keys.update(row.keys())
            return list(all_keys)
        except Exception as e:
            logger.error(f"Error discovering language codes: {e}")
            return ["en", "it", "de", "ru"]

    async def get_active_languages(self) -> List[str]:
        """
        Возвращает список кодов активных языков для отображения.
        Сначала проверяет настройки, если там пусто или только дефолт,
        дополняет списком реально существующих языков из базы.
        
        Returns:
            List[str]: Список кодов активных языков.
        """
        raw = await get_setting(self.db, 'active_languages', '')
        if raw:
            langs = [l.strip() for l in raw.split(',') if l.strip()]
        else:
            # Если настройки нет, берем все, что нашли в базе
            langs = await self.get_all_available_language_codes()
            if not langs:
                langs = ['en', 'it', 'de']
        
        # Гарантируем уникальность и наличие базовых
        res = list(dict.fromkeys(langs))
        if 'en' not in res: res.append('en')
        return res

    def get_sentences_json(self) -> str:
        """
        Читает и возвращает JSON с предложениями из файла ресурсов.
        Используется на странице 'Sentence Trainer'.
        """
        from ..config import settings
        import os
        path = settings.resources_dir / "sentence.json"
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Error reading sentence.json: {e}")
        return "[]"

    async def get_all_language_names(self) -> Dict[str, str]:
        """
        Возвращает мапу всех доступных языков (код -> название).
        
        Returns:
            Dict[str, str]: Словарь соответствия кодов и названий языков.
        """
        import json
        raw = await get_setting(self.db, 'language_names', '{"en": "English", "it": "Italian", "de": "German", "ru": "Russian"}')
        try:
            return json.loads(raw if raw else '{}')
        except Exception:
            return {"en": "English", "it": "Italian", "de": "German", "ru": "Russian"}

    async def mark_word_known(self, word_eng: str, lang: str, is_known: bool = True) -> Optional[models.WordStats]:
        """
        Помечает конкретный перевод слова как известный или неизвестный.
        
        Args:
            word_eng: Английское слово (уникальный ключ).
            lang: Код языка.
            is_known: Флаг знания.
            
        Returns:
            Optional[models.WordStats]: Обновленный объект слова или None.
        """
        try:
            result = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == word_eng))
            w = result.scalar_one_or_none()
            if w:
                if w.knowledge_stats is None:
                    w.knowledge_stats = {}
                
                # Обновляем JSON структуру
                stats = dict(w.knowledge_stats)
                stats[lang] = is_known
                w.knowledge_stats = stats
                
                # Для обратной совместимости пока обновляем и старые колонки
                if lang in ['eng', 'en']: w.is_known_en = is_known
                elif lang == 'it': w.is_known_it = is_known
                elif lang == 'de': w.is_known_de = is_known

                # АВТОМАТИКА: Проверяем, выучено ли слово для всех АКТИВНЫХ языков
                active_langs = await self.get_active_languages()
                is_fully_known = True
                for al in active_langs:
                    if not stats.get(al):
                        is_fully_known = False
                        break
                
                w.is_learned = is_fully_known
                
                await self.db.commit()
                return w
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error marking word known {word_eng}: {e}")
            raise

    async def update_word_full_dynamic(self, word_eng: str, translations: Dict[str, str], meaning: str) -> Optional[models.WordStats]:
        """
        Обновляет слово, используя динамический словарь переводов.
        
        Args:
            word_eng: Английское слово.
            translations: Словарь новых переводов.
            meaning: Описание/контекст.
            
        Returns:
            Optional[models.WordStats]: Обновленный объект или None.
        """
        try:
            result = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == word_eng))
            w = result.scalar_one_or_none()
            if w:
                w.meaning = meaning
                w.ru = translations.get('ru', w.ru)
                w.it = translations.get('it', w.it) # Backward compatibility
                w.de = translations.get('de', w.de) # Backward compatibility
                
                # Обновляем JSON (мержим новые переводы с существующими)
                current_trans = dict(w.translations or {})
                current_trans.update(translations)
                w.translations = current_trans
                
                await self.db.commit()
                return w
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating word dynamic {word_eng}: {e}")
            raise

    
    async def search_words(self, query: str, limit: int = 10) -> List[models.WordStats]:
        """Поиск слов по шаблону (по всем колонкам)."""
        try:
            q = f"%{query.strip()}%"
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
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error searching words by query '{query}': {e}")
            raise
    
    async def upsert_word_dynamic(self, eng: str, translations: Dict[str, str], meaning: str) -> Optional[models.WordStats]:
        """Создает новое слово или обновляет существующее через динамические переводы."""
        try:
            res = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == eng))
            w = res.scalar_one_or_none()
            
            if w:
                return await self.update_word_full_dynamic(eng, translations, meaning)
            
            # Создаем новое слово
            new_word = models.WordStats(
                word=eng, eng=eng, 
                it=translations.get('it', ''),
                de=translations.get('de', ''),
                ru=translations.get('ru', ''),
                meaning=meaning, 
                translations=translations,
                knowledge_stats={l: False for l in translations.keys()}
            )
            self.db.add(new_word)
            await self.db.commit()
            return new_word
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error upserting word dynamic '{eng}': {e}")
            raise

    async def get_random_words(self, limit: int) -> List[models.WordStats]:
        """Возвращает случайные невыученные слова."""
        try:
            stmt = select(models.WordStats).where(
                models.WordStats.is_learned == False
            ).order_by(func.random()).limit(limit)
            
            result = await self.db.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error fetching test words: {e}")
            raise

    async def get_learned_words(self, limit: int) -> List[models.WordStats]:
        """Возвращает случайные выученные слова (для повторения)."""
        try:
            stmt = select(models.WordStats).where(
                models.WordStats.is_learned == True
            ).order_by(func.random()).limit(limit)
            
            result = await self.db.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error fetching learned words: {e}")
            raise

    async def get_all_words_for_test(self, limit: int) -> List[models.WordStats]:
        """Возвращает смесь слов для теста (без фильтра по выученности)."""
        try:
            stmt = select(models.WordStats).order_by(func.random()).limit(limit)
            result = await self.db.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error fetching test pool: {e}")
            raise

    async def get_random_test_words_data(self, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Возвращает данные для теста 'Brain Workout'.
        Выбирает случайные слова и для каждого назначает случайный язык для проверки.
        С вероятностью 20% подмешивает выученные слова для закрепления.
        """
        try:
            # 1. Получаем пулы слов
            unlearned_pool = await self.get_random_words(limit * 2)
            learned_pool = await self.get_learned_words(limit * 2)
            
            words = []
            for _ in range(limit):
                # С вероятностью 20% берем выученное слово
                if learned_pool and (not unlearned_pool or random.random() < 0.2):
                    words.append(learned_pool.pop(random.randint(0, len(learned_pool) - 1)))
                elif unlearned_pool:
                    words.append(unlearned_pool.pop(random.randint(0, len(unlearned_pool) - 1)))
            
            if not words and not unlearned_pool and not learned_pool:
                # Если пулы пусты (база пуста), пробуем взять хоть что-то
                words = await self.get_all_words_for_test(limit)
            
            if not words:
                return []

            active_langs = await self.get_active_languages()
            result = []

            for w in words:
                # Выбираем случайный язык из активных для теста
                # Проверяем наличие перевода как в JSON, так и в прямых колонках
                testable_langs = [
                    l for l in active_langs 
                    if (w.translations and w.translations.get(l)) or 
                       (l == 'en' and w.eng) or
                       (l == 'it' and w.it) or
                       (l == 'de' and w.de)
                ]
                test_lang = random.choice(testable_langs) if testable_langs else active_langs[0]
                
                # Получаем само слово для этого языка
                word_to_test = ""
                if test_lang == 'en': word_to_test = w.eng
                elif test_lang == 'it': word_to_test = w.it
                elif test_lang == 'de': word_to_test = w.de
                else: word_to_test = (w.translations or {}).get(test_lang, "")
                
                # Если в translations пусто, пробуем прямые колонки
                if not word_to_test:
                    word_to_test = getattr(w, test_lang, "") if hasattr(w, test_lang) else w.eng

                result.append({
                    "eng": w.eng,
                    "ru": w.ru,
                    "it": w.it,
                    "de": w.de,
                    "test_lang": test_lang,
                    "word_to_test": word_to_test,
                    "meaning": w.meaning,
                    "count": w.count,
                    "is_learned": w.is_learned,
                    "translations": w.translations or {}
                })

            # Регистрируем показ этих слов
            await self.record_word_shows(words)
            
            return result
        except Exception as e:
            logger.error(f"Error preparing test words data: {e}")
            return []

    async def record_word_shows(self, words: List[models.WordStats]) -> bool:
        """Регистрирует показы для списка слов (инкремент счетчиков и обновление кэша)."""
        if not words: return True
        
        now = datetime.now()
        today = now.date()
        
        try:
            # Получаем активные языки для инкремента их счетчиков
            active_langs = await self.get_active_languages()
            # Всегда добавляем русский, так как он участвует в показе как базовый
            active_langs_for_stats = list(set(active_langs + ['ru', 'en']))

            for w in words:
                # Глобальный счетчик (для совместимости)
                w.count += 1
                w.last_shown = now.replace(tzinfo=None)
                
                # Поэзыковые счетчики в JSON
                stats = dict(w.show_stats or {})
                for lang in active_langs_for_stats:
                    stats[lang] = stats.get(lang, 0) + 1
                w.show_stats = stats
            
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
            metrics = await self.get_current_metrics()
            
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

    async def reset_all_stats(self) -> bool:
        """Сбрасывает всю статистику изучения слов."""
        try:
            await self.db.execute(update(models.WordStats).values({
                models.WordStats.count: 0,
                models.WordStats.is_known_en: False,
                models.WordStats.is_known_it: False,
                models.WordStats.is_known_de: False,
                models.WordStats.is_learned: False,
                models.WordStats.show_stats: {},
                models.WordStats.knowledge_stats: {}
            }))
            await self.db.execute(delete(models.WordStatsSnapshot))
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error resetting all stats: {e}")
            return False

    async def get_current_metrics(self) -> Dict[str, Any]:
        """Возвращает текущие метрики на основе активных языков."""
        try:
            total_count_res = await self.db.execute(select(func.count(models.WordStats.word)))
            total_count = total_count_res.scalar() or 0
            
            active_langs = await self.get_active_languages()
            
            coverage, imw, learned_count = 0.0, 0.0, 0
            total_lang_shows = 0
            lang_coverages: List[float] = []

            if total_count > 0 and active_langs:
                for lang in active_langs:
                    # Покрытие одного языка = (кол-во слов с показами > 0) / всего слов
                    # Добавляем OR count > 0 для поддержки старых данных без show_stats
                    res_learned = await self.db.execute(
                        text(f"SELECT COUNT(*) FROM word_stats WHERE (JSON_EXTRACT(show_stats, '$.{lang}') > 0 OR count > 0)")
                    )
                    count_learned = res_learned.scalar() or 0
                    lang_coverages.append(count_learned / total_count)
                    
                    # Суммарные показы для iMW
                    # Используем MAX(JSON_EXTRACT..., count) для примерной оценки
                    res_shows = await self.db.execute(
                        text(f"SELECT SUM(MAX(IFNULL(JSON_EXTRACT(show_stats, '$.{lang}'), 0), IFNULL(count, 0))) FROM word_stats")
                    )
                    total_lang_shows += (res_shows.scalar() or 0)

                coverage = round((sum(lang_coverages) / len(lang_coverages)) * 100, 2)
                target_shows = total_count * 80 * len(active_langs)
                imw = round((total_lang_shows / target_shows) * 100, 2) if target_shows > 0 else 0.0
                learned_count = int(sum([c * total_count for c in lang_coverages]) / len(lang_coverages))
            
            # Показы за сегодня
            today = datetime.now().date()
            daily_res = await self.db.execute(
                select(models.WordShowsDaily).where(models.WordShowsDaily.date == today)
            )
            daily_row = daily_res.scalar_one_or_none()
            shown_today = daily_row.shows_count if daily_row else 0

            return {
                'total_count': total_count,
                'learned_count': learned_count,
                'coverage': coverage,
                'imw': imw,
                'shown_today': shown_today,
                'today': today
            }
        except Exception as e:
            logger.error(f"Error calculating metrics: {e}")
            return {
                'total_count': 0, 'learned_count': 0, 'coverage': 0.0, 'imw': 0.0, 'shown_today': 0, 'today': datetime.now().date()
            }

    async def get_top_encountered_words(self, limit: int = 12) -> List[models.WordStats]:
        """Возвращает самые часто встречающиеся слова для текущих активных языков."""
        try:
            active_langs = await self.get_active_languages()
            if not active_langs:
                stmt = select(models.WordStats).order_by(models.WordStats.count.desc()).limit(limit)
                res = await self.db.execute(stmt)
                return list(res.scalars().all())

            # Суммируем показы по всем активным языкам в JSON
            sum_expr = " + ".join([f"COALESCE(JSON_EXTRACT(show_stats, '$.{l}'), 0)" for l in active_langs])
            
            stmt = select(models.WordStats).order_by(text(f"({sum_expr}) DESC")).limit(limit)
            res = await self.db.execute(stmt)
            return list(res.scalars().all())
        except Exception as e:
            logger.error(f"Error getting top words: {e}")
            return []

    async def get_distribution_stats(self) -> Dict[str, int]:
        """Возвращает распределение слов по уровням знаний."""
        try:
            total_count_res = await self.db.execute(select(func.count(models.WordStats.word)))
            total_count = total_count_res.scalar() or 0
            if total_count == 0: return {}

            active_langs = await self.get_active_languages()
            if not active_langs: return {}

            # Средний показатель показов по активным языкам
            avg_shows_expr = "(" + " + ".join([f"COALESCE(JSON_EXTRACT(show_stats, '$.{l}'), 0)" for l in active_langs]) + f") / {len(active_langs)}"

            async def count_in_range(min_v: int, max_v: Optional[int] = None) -> int:
                if max_v is not None:
                    stmt = text(f"SELECT COUNT(*) FROM word_stats WHERE {avg_shows_expr} >= {min_v} AND {avg_shows_expr} <= {max_v}")
                else:
                    stmt = text(f"SELECT COUNT(*) FROM word_stats WHERE {avg_shows_expr} >= {min_v}")
                res = await self.db.execute(stmt)
                return res.scalar() or 0

            return {
                "New (0)": await count_in_range(0, 0),
                "Beginner (1-5)": await count_in_range(1, 5),
                "Intermediate (6-15)": await count_in_range(6, 15),
                "Advanced (16-40)": await count_in_range(16, 40),
                "Expert (41-80)": await count_in_range(41, 80),
                "Master (80+)": await count_in_range(81)
            }
        except Exception as e:
            logger.error(f"Error calculating distribution: {e}")
            return {}

    async def toggle_active_triplet_known(self, word_eng: str, is_known: bool = True) -> Optional[models.WordStats]:
        """Помечает только активную тройку иностранных языков как известных."""
        try:
            result = await self.db.execute(select(models.WordStats).where(models.WordStats.eng == word_eng))
            w = result.scalar_one_or_none()
            if w:
                active_langs = await self.get_active_languages()
                k_stats = dict(w.knowledge_stats or {})
                
                for lang in active_langs:
                    k_stats[lang] = is_known
                    if lang in ['eng', 'en']: w.is_known_en = is_known
                    elif lang == 'it': w.is_known_it = is_known
                    elif lang == 'de': w.is_known_de = is_known
                
                w.knowledge_stats = k_stats
                
                is_fully_known = True
                for al in active_langs:
                    if not k_stats.get(al):
                        is_fully_known = False
                        break
                w.is_learned = is_fully_known

                await self.db.commit()
                return w
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error toggling active triplet known {word_eng}: {e}")
            raise

    async def delete_word(self, word_eng: str) -> bool:
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

    async def save_daily_snapshot(self, date_obj: date, coverage: float, imw: float, total_count: int, fully_learned_count: int) -> None:
        """Сохраняет или обновляет снимок статистики за определенную дату."""
        try:
            stmt = select(models.WordStatsSnapshot).where(models.WordStatsSnapshot.date == date_obj)
            res = await self.db.execute(stmt)
            snap = res.scalar_one_or_none()
            
            if snap:
                snap.coverage = coverage
                snap.imw = imw
                snap.total_count = total_count
                snap.fully_learned_count = fully_learned_count
            else:
                self.db.add(models.WordStatsSnapshot(
                    date=date_obj, 
                    coverage=coverage, 
                    imw=imw, 
                    total_count=total_count,
                    fully_learned_count=fully_learned_count
                ))
            
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error saving snapshot for {date_obj}: {e}")

    async def record_test_result(self, is_correct: bool, lang: Optional[str] = None) -> None:
        """Регистрирует результат теста (простой инкремент счетчиков)."""
        from sqlalchemy.orm.attributes import flag_modified
        try:
            today = datetime.now().date()
            stmt = select(models.WordStatsSnapshot).where(models.WordStatsSnapshot.date == today)
            res = await self.db.execute(stmt)
            snap = res.scalar_one_or_none()
            
            if not snap:
                metrics = await self.get_current_metrics()
                snap = models.WordStatsSnapshot(
                    date=today, 
                    coverage=metrics['coverage'], 
                    imw=metrics['imw'],
                    total_count=metrics['total_count'],
                    test_stats_json={}
                )
                self.db.add(snap)
            
            # 1. Глобальные счетчики
            snap.test_total += 1
            if is_correct:
                snap.test_success += 1
            
            # 2. Счетчики по языку
            if lang:
                stats = dict(snap.test_stats_json or {})
                lang_data = stats.get(lang, {"total": 0, "success": 0})
                lang_data["total"] += 1
                if is_correct:
                    lang_data["success"] += 1
                stats[lang] = lang_data
                snap.test_stats_json = stats
                # ВАЖНО для SQLite: помечаем поле как измененное
                flag_modified(snap, "test_stats_json")
                logger.info(f"DB Update: lang='{lang}', total={lang_data['total']}, success={lang_data['success']}")
            else:
                logger.warning("DB Update: No language provided! Stats will be inconsistent.")
            
            await self.db.commit()
            logger.info(f"Test recorded successfully. Global: {snap.test_success}/{snap.test_total}")
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error recording test result: {e}")

    async def get_snapshot_history(self, limit: int = 30) -> List[models.WordStatsSnapshot]:
        """Возвращает историю снимков статистики (последние N дней в хронологическом порядке)."""
        try:
            stmt = select(models.WordStatsSnapshot).order_by(models.WordStatsSnapshot.date.desc()).limit(limit)
            res = await self.db.execute(stmt)
            # Разворачиваем, чтобы график шел слева направо (от старых к новым)
            return list(reversed(res.scalars().all()))
        except Exception as e:
            logger.error(f"Error fetching snapshot history: {e}")
            return []

    async def get_daily_shows_history(self, limit: int = 30) -> List[models.WordShowsDaily]:
        """Возвращает историю ежедневных показов."""
        try:
            stmt = select(models.WordShowsDaily).order_by(models.WordShowsDaily.date.desc()).limit(limit)
            res = await self.db.execute(stmt)
            # Разворачиваем, чтобы было в хронологическом порядке
            return list(reversed(res.scalars().all()))
        except Exception as e:
            logger.error(f"Error fetching daily shows history: {e}")
            return []

    async def get_knowledge_counts(self, languages: List[str]) -> Dict[str, int]:
        """Возвращает количество 'известных' слов для каждого из указанных языков."""
        counts = {}
        try:
            for lang in languages:
                stmt = text(f"SELECT COUNT(*) FROM word_stats WHERE JSON_EXTRACT(knowledge_stats, '$.{lang}') = 1")
                res = await self.db.execute(stmt)
                counts[lang] = res.scalar() or 0
        except Exception as e:
            logger.error(f"Error getting knowledge counts: {e}")
        return counts

    async def get_fully_learned_count(self, languages: List[str]) -> int:
        """Возвращает количество слов, полностью выученных (флаг is_learned = True)."""
        try:
            stmt = select(func.count(models.WordStats.word)).where(models.WordStats.is_learned == True)
            res = await self.db.execute(stmt)
            return res.scalar() or 0
        except Exception as e:
            logger.error(f"Error getting fully learned count: {e}")
            return 0


