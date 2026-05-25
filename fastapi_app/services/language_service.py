from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Set
from .. import models
from .settings_service import get_setting
from ..logger import logger

class LanguageService:
    """Service for managing language configurations and availability."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_available_language_codes(self) -> List[str]:
        """Scans the database for unique language codes in translations."""
        try:
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
        """Returns list of active language codes from settings or DB."""
        raw = await get_setting(self.db, 'active_languages', '')
        if raw:
            langs = [l.strip() for l in raw.split(',') if l.strip()]
        else:
            langs = await self.get_all_available_language_codes()
            if not langs:
                langs = ['en', 'it', 'de']
        
        res = list(dict.fromkeys(langs))
        return res

    async def get_all_language_names(self) -> Dict[str, str]:
        """Returns a mapping of language codes to full names."""
        import json
        raw = await get_setting(self.db, 'language_names', '{"en": "English", "it": "Italian", "de": "German", "ru": "Russian"}')
        try:
            return json.loads(raw if raw else '{}')
        except Exception:
            return {"en": "English", "it": "Italian", "de": "German", "ru": "Russian"}
