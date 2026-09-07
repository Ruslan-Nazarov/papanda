"""Справочник провайдеров + запрос остатка лимита.

Выбор модели из интерфейса убран (2026-09-07). Модуль оставлен как основа
для АВТОМАТИЧЕСКОГО роутинга задач под модели (в работе): task → provider,
через ai_service.set_preferred_provider() + LLMRegistry._order(prefer=...).
"""
from __future__ import annotations

import time
from typing import Optional

from fastapi_app.services.llm_provider import llm_registry

# id → как показать. Порядок = как в выпадашке. Только реально живые каналы.
MODELS = [
    {"id": "auto",       "provider": None,        "name": "Авто",            "sub": "по доступности"},
    {"id": "groq",       "provider": "Groq",      "name": "Groq 120B",       "sub": "gpt-oss-120b, быстрый"},
    {"id": "groq_alt",   "provider": "GroqAlt",   "name": "Groq Qwen 27B",  "sub": "отдельный лимит"},
    {"id": "gemini",     "provider": "Gemini",    "name": "Gemini Flash",   "sub": "медленнее стартует"},
    {"id": "openrouter", "provider": "OpenRouter","name": "MiniMax M3",     "sub": "OpenRouter, запас"},
]
_BY_ID = {m["id"]: m for m in MODELS}
_BY_PROVIDER = {m["provider"]: m for m in MODELS if m["provider"]}

_LIMIT_CACHE: dict[str, tuple[float, dict]] = {}
_LIMIT_TTL = 20.0


def provider_for(model_id: Optional[str]) -> Optional[str]:
    m = _BY_ID.get(model_id or "auto")
    return m["provider"] if m else None


def list_models() -> list[dict]:
    """Список для интерфейса + признак доступности (есть ли ключ)."""
    out = []
    for m in MODELS:
        available = True
        if m["provider"]:
            p = next((p for p in llm_registry.providers if p.name == m["provider"]), None)
            available = bool(p and p.api_key and p.api_key != "your_groq_api_key_here")
        out.append({**m, "available": available})
    return out


def _parse_reset(v: str) -> str:
    return (v or "").strip()


async def probe_limit(model_id: str) -> dict:
    """Остаток лимита у выбранного провайдера. Крохотный (max_tokens=1) вызов,
    читаем заголовки x-ratelimit-*. Кэш 20 c. Возвращает {} если провайдер
    лимиты не публикует или вызов не удался."""
    provider_name = provider_for(model_id)
    if not provider_name:
        return {}

    cached = _LIMIT_CACHE.get(provider_name)
    if cached and time.time() - cached[0] < _LIMIT_TTL:
        return cached[1]

    provider = next((p for p in llm_registry.providers if p.name == provider_name), None)
    if not provider or not provider.api_key:
        return {}

    data: dict = {}
    try:
        raw = await provider.client.chat.completions.with_raw_response.create(
            model=provider.model_name,
            messages=[{"role": "user", "content": "ok"}],
            max_tokens=1,
            timeout=8,
        )
        h = raw.headers
        rem_req = h.get("x-ratelimit-remaining-requests")
        rem_tok = h.get("x-ratelimit-remaining-tokens")
        lim_req = h.get("x-ratelimit-limit-requests")
        lim_tok = h.get("x-ratelimit-limit-tokens")
        if rem_tok is not None:
            data["tokens"] = {"remaining": rem_tok, "limit": lim_tok,
                              "reset": _parse_reset(h.get("x-ratelimit-reset-tokens", ""))}
        if rem_req is not None:
            data["requests"] = {"remaining": rem_req, "limit": lim_req,
                                "reset": _parse_reset(h.get("x-ratelimit-reset-requests", ""))}
    except Exception as e:  # noqa: BLE001
        data = {"error": str(e)[:120]}

    _LIMIT_CACHE[provider_name] = (time.time(), data)
    return data
