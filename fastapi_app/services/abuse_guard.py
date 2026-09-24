"""Atomic, persistent admission budget. Failed runs consume their reservation."""
import asyncio
from fastapi_app.config import settings
from fastapi_app.rate_limiter import client_ip
from fastapi_app.services.security_store import reserve_budget, quota_stats

async def reserve_generation(request):
    sid = getattr(request.state, 'session_id', 'local')
    await asyncio.to_thread(reserve_budget, [
        ('global', settings.GLOBAL_DAILY_GENERATION_CAP),
        ('session:' + sid, settings.SESSION_DAILY_GENERATION_CAP),
        ('ip:' + client_ip(request), settings.IP_DAILY_GENERATION_CAP),
    ])

async def stats():
    return await asyncio.to_thread(quota_stats)
