from slowapi import Limiter
from starlette.requests import Request

from fastapi_app.config import settings


def client_ip(request: Request) -> str:
    """Реальный IP клиента для rate-limit. За обратным прокси request.client.host
    — это IP прокси (один на всех). Берём из X-Forwarded-For запись
    TRUSTED_PROXY_COUNT-ю справа (nginx добавляет реальный IP в конец)."""
    n = settings.TRUSTED_PROXY_COUNT
    if n >= 1:
        parts = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
        if len(parts) >= n:
            return parts[-n]
    return request.client.host if request.client else "anon"


limiter = Limiter(key_func=client_ip, default_limits=["10/minute"])
