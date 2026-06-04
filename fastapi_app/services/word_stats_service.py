from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, update, delete
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from .. import models
from ..logger import logger

class WordStatsService:
    """Service for calculating word learning metrics, snapshots, and distribution."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_current_metrics(self, active_langs: List[str]) -> Dict[str, Any]:
        """Calculates current metrics based on active languages."""
        try:
            total_count_res = await self.db.execute(select(func.count(models.WordStats.word)))
            total_count = total_count_res.scalar() or 0
            
            coverage, imw, learned_count = 0.0, 0.0, 0
            total_lang_shows = 0
            lang_coverages: List[float] = []
            
            coverage_by_lang = {}
            imw_by_lang = {}
            learned_count_by_lang = {}

            if total_count > 0 and active_langs:
                for lang in active_langs:
                    # Coverage for one language = (words with shows > 0) / total words
                    res_learned = await self.db.execute(
                        text(f"SELECT COUNT(*) FROM word_stats WHERE JSON_EXTRACT(show_stats, '$.{lang}') > 0")
                    )
                    count_learned = res_learned.scalar() or 0
                    lang_cov = count_learned / total_count
                    lang_coverages.append(lang_cov)
                    
                    coverage_by_lang[lang] = round(lang_cov * 100, 2)
                    learned_count_by_lang[lang] = count_learned
                    
                    # Total shows for iMW
                    res_shows = await self.db.execute(
                        text(f"SELECT SUM(IFNULL(JSON_EXTRACT(show_stats, '$.{lang}'), 0)) FROM word_stats")
                    )
                    lang_shows = res_shows.scalar() or 0
                    total_lang_shows += lang_shows
                    
                    lang_imw = round((lang_shows / (total_count * 80)) * 100, 2)
                    imw_by_lang[lang] = lang_imw

                coverage = round((sum(lang_coverages) / len(lang_coverages)) * 100, 2)
                target_shows = total_count * 80 * len(active_langs)
                imw = round((total_lang_shows / target_shows) * 100, 2) if target_shows > 0 else 0.0
                learned_count = int(sum(learned_count_by_lang.values()) / len(active_langs))
            
            # Shows today
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
                'today': today,
                'coverage_by_lang': coverage_by_lang,
                'imw_by_lang': imw_by_lang,
                'learned_count_by_lang': learned_count_by_lang
            }
        except Exception as e:
            logger.error(f"Error calculating metrics: {e}")
            return {
                'total_count': 0, 'learned_count': 0, 'coverage': 0.0, 'imw': 0.0, 'shown_today': 0, 'today': datetime.now().date(),
                'coverage_by_lang': {}, 'imw_by_lang': {}, 'learned_count_by_lang': {}
            }

    async def get_distribution_stats(self, active_langs: List[str]) -> Dict[str, int]:
        """Returns word distribution by knowledge levels."""
        try:
            total_count_res = await self.db.execute(select(func.count(models.WordStats.word)))
            total_count = total_count_res.scalar() or 0
            if total_count == 0 or not active_langs: return {}

            # Average shows expression
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

    async def save_daily_snapshot(self, date_obj: date, coverage: float, imw: float, total_count: int, fully_learned_count: int) -> None:
        """Saves or updates statistics snapshot for a date."""
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

    async def get_snapshot_history(self, limit: int = 30) -> List[models.WordStatsSnapshot]:
        """Returns snapshot history."""
        try:
            stmt = select(models.WordStatsSnapshot).order_by(models.WordStatsSnapshot.date.desc()).limit(limit)
            res = await self.db.execute(stmt)
            return list(reversed(res.scalars().all()))
        except Exception as e:
            logger.error(f"Error fetching snapshot history: {e}")
            return []

    async def get_daily_shows_history(self, limit: int = 30) -> List[models.WordShowsDaily]:
        """Returns history of daily word shows."""
        try:
            stmt = select(models.WordShowsDaily).order_by(models.WordShowsDaily.date.desc()).limit(limit)
            res = await self.db.execute(stmt)
            return list(reversed(res.scalars().all()))
        except Exception as e:
            logger.error(f"Error fetching daily shows: {e}")
            return []

    async def get_knowledge_counts(self, languages: List[str]) -> Dict[str, int]:
        """Returns count of known words for each language."""
        counts = {}
        try:
            for lang in languages:
                stmt = text(f"SELECT COUNT(*) FROM word_stats WHERE JSON_EXTRACT(knowledge_stats, '$.{lang}') = 1")
                res = await self.db.execute(stmt)
                counts[lang] = res.scalar() or 0
        except Exception as e:
            logger.error(f"Error getting knowledge counts: {e}")
        return counts

    async def get_fully_learned_count(self, active_langs: List[str]) -> int:
        """Returns total count of fully learned words (known in all active languages)."""
        if not active_langs:
            return 0
        try:
            conditions = " AND ".join([f"JSON_EXTRACT(knowledge_stats, '$.{lang}') = 1" for lang in active_langs])
            stmt = text(f"SELECT COUNT(*) FROM word_stats WHERE {conditions}")
            res = await self.db.execute(stmt)
            return res.scalar() or 0
        except Exception as e:
            logger.error(f"Error getting fully learned count: {e}")
            return 0
