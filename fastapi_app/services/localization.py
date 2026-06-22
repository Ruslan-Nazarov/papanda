import json
import os
from pathlib import Path
from typing import Dict, Any

from fastapi import Request
from ..config import INTERNAL_ROOT
from ..logger import logger

class LocalizationService:
    def __init__(self):
        self.locales_dir = INTERNAL_ROOT / "fastapi_app" / "locales"
        self.translations: Dict[str, Dict[str, Any]] = {}
        self.default_locale = "en"
        self._load_translations()

    def _load_translations(self):
        if not self.locales_dir.exists():
            logger.warning(f"Locales directory not found at {self.locales_dir}")
            return
            
        for file_path in self.locales_dir.glob("*.json"):
            locale = file_path.stem
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    self.translations[locale] = json.load(f)
                logger.info(f"Loaded translations for locale: {locale}")
            except Exception as e:
                logger.error(f"Failed to load translations for {locale}: {e}")

    def get_text(self, locale: str, key: str) -> str:
        """Get translated text by key (e.g. 'header.dialectics'). Fallback to default_locale, then to key."""
        keys = key.split('.')
        
        # Try requested locale
        result = self._navigate_dict(self.translations.get(locale, {}), keys)
        if result is not None:
            return result
            
        # Try default locale
        if locale != self.default_locale:
            result = self._navigate_dict(self.translations.get(self.default_locale, {}), keys)
            if result is not None:
                return result
                
        # Fallback to key itself
        return key

    def _navigate_dict(self, d: dict, keys: list) -> Any:
        current = d
        for k in keys:
            if isinstance(current, dict) and k in current:
                current = current[k]
            else:
                return None
        return current if isinstance(current, str) else None
        
    def get_translations_for_locale(self, locale: str) -> Dict[str, Any]:
        """Returns the full dictionary for a locale (merged with default locale for missing keys)."""
        result = {}
        
        if self.default_locale in self.translations:
            self._deep_merge(result, self.translations[self.default_locale])
            
        if locale != self.default_locale and locale in self.translations:
            self._deep_merge(result, self.translations[locale])
            
        return result
        
    def _deep_merge(self, dest: dict, src: dict):
        for k, v in src.items():
            if isinstance(v, dict):
                node = dest.setdefault(k, {})
                self._deep_merge(node, v)
            else:
                dest[k] = v

# Global instance
localization_service = LocalizationService()

def get_translate_func(request: Request):
    """Factory to get a translation function bound to the current request."""
    locale = request.cookies.get("locale", "en")
    
    def translate(key: str) -> str:
        return localization_service.get_text(locale, key)
        
    return translate

# Triggering reload to refresh localized translations from json files.
