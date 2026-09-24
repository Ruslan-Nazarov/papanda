from slowapi import Limiter
from starlette.requests import Request

from fastapi_app.config import settings
import ipaddress


def trusted_proxy(address):
    try:
        ip = ipaddress.ip_address(address)
        return any(ip in ipaddress.ip_network(cidr.strip())
                   for cidr in settings.TRUSTED_PROXY_IPS.split(',') if cidr.strip())
    except ValueError:
        return False


def client_ip(request: Request) -> str:
    """Реальный IP клиента для rate-limit. За обратным прокси request.client.host
    — это IP прокси (один на всех). Берём из X-Forwarded-For запись
    TRUSTED_PROXY_COUNT-ю справа (nginx добавляет реальный IP в конец)."""
    peer = request.client.host if request.client else 'anon'
    n = settings.TRUSTED_PROXY_COUNT
    if n >= 1 and trusted_proxy(peer):
        parts = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
        intermediates = parts[-(n - 1):] if n > 1 else []
        if len(parts) >= n and all(trusted_proxy(p) for p in intermediates):
            try:
                return str(ipaddress.ip_address(parts[-n]))
            except ValueError:
                pass
    return peer


limiter = Limiter(key_func=client_ip, default_limits=["10/minute"])
