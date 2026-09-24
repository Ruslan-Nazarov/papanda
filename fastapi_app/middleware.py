import uuid
import asyncio
import ipaddress
from fastapi import Request, HTTPException
from starlette.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi_app.config import settings
from fastapi_app.services.security_store import session_for_cookie
from fastapi_app.rate_limiter import trusted_proxy


class TrustedSchemeMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'http' and settings.TRUSTED_PROXY_COUNT > 0:
            peer = scope.get('client')
            proto = dict(scope['headers']).get(b'x-forwarded-proto', b'').decode('latin-1')
            if peer and trusted_proxy(peer[0]) and proto in {'http', 'https'}:
                scope = {**scope, 'scheme': proto}
        await self.app(scope, receive, send)


class AccessBoundaryMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if not settings.DEMO_MODE:
            try:
                local = ipaddress.ip_address(request.client.host).is_loopback
            except (ValueError, AttributeError):
                local = False
            if (not local or request.url.hostname not in {'localhost', '127.0.0.1', '::1'}
                    or any(h in request.headers for h in ('forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto'))):
                return JSONResponse({'detail': 'Personal mode is available only on loopback without a proxy'}, 403)
        if request.method not in {'GET', 'HEAD', 'OPTIONS'}:
            origin = request.headers.get('origin')
            if (request.headers.get('sec-fetch-site') == 'cross-site'
                    or (origin and origin.rstrip('/') != str(request.base_url).rstrip('/'))):
                return JSONResponse({'detail': 'Cross-origin writes are not allowed'}, 403)
        return await call_next(request)


class BodyLimitMiddleware:
    """Read a bounded body before JSON/multipart parsing, including chunked requests."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        limit = settings.MAX_REQUEST_BYTES
        headers = dict(scope['headers'])
        try:
            length = int(headers.get(b'content-length', b'0'))
            if length < 0:
                raise ValueError
        except ValueError:
            return await JSONResponse({'detail': 'Invalid Content-Length'}, 400)(scope, receive, send)
        if length > limit:
            return await JSONResponse({'detail': 'Request body too large'}, 413)(scope, receive, send)
        chunks, size = [], 0
        try:
            async with asyncio.timeout(20):
                while True:
                    message = await receive()
                    if message['type'] == 'http.disconnect':
                        return
                    chunk = message.get('body', b'')
                    size += len(chunk)
                    if size > limit:
                        return await JSONResponse({'detail': 'Request body too large'}, 413)(scope, receive, send)
                    chunks.append(chunk)
                    if not message.get('more_body', False):
                        break
        except TimeoutError:
            return await JSONResponse({'detail': 'Request body timeout'}, 408)(scope, receive, send)
        body = b''.join(chunks)
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {'type': 'http.request', 'body': body, 'more_body': False}
            return await receive()

        await self.app(scope, bounded_receive, send)

class SessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith(('/s/', '/api/dialectics/shared/', '/static/')) or request.url.path in {'/health', '/favicon.ico'}:
            return await call_next(request)
        session_id = request.cookies.get("session_id")
        new_cookie = None
        if settings.DEMO_MODE:
            try:
                session_id, new_cookie = await asyncio.to_thread(session_for_cookie, session_id)
            except HTTPException as error:
                return JSONResponse({'detail': error.detail}, error.status_code)
        elif not session_id:
            session_id = str(uuid.uuid4())
            new_cookie = session_id
        request.state.session_id = session_id if settings.DEMO_MODE else 'local'
        response = await call_next(request)
        if new_cookie:
            is_https = request.url.scheme == "https"
            response.set_cookie(
                key="session_id",
                value=new_cookie,
                httponly=True,
                secure=is_https,
                max_age=settings.DEMO_SESSION_TTL_SECONDS,
                samesite="lax"
            )
            
        return response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' "
            "https://mc.yandex.ru https://www.googletagmanager.com; "
            "style-src 'self' 'unsafe-inline'; "
            "font-src 'self'; "
            "img-src 'self' data: blob: https://mc.yandex.ru https://yandex.ru "
            "https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com; "
            "connect-src 'self' https://mc.yandex.ru wss://mc.yandex.ru https://mc.yandex.com https://yandex.ru "
            "https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; "
            "frame-src 'self' https://mc.yandex.ru; "
            "worker-src 'self' blob:; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none'"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if request.url.path.startswith(('/s/', '/api/dialectics/shared/')):
            response.headers["Cache-Control"] = "no-store"
            response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(self), camera=()"
        return response

class LocaleMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        locale = request.cookies.get("locale")
        if not locale:
            accept_lang = request.headers.get("Accept-Language", "").lower()
            primary_lang = accept_lang.split(",")[0][:2] if accept_lang else "en"
            
            if primary_lang == "ru":
                locale = "ru"
            elif primary_lang in ("kk", "kz"):
                locale = "kz"
            else:
                locale = "en"
        request.state.locale = locale
        return await call_next(request)

class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith('/static/dist/') and request.url.path != '/static/dist/manifest.json' and response.status_code == 200:
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        elif request.url.path.startswith('/static/') or 'text/html' in response.headers.get('content-type', ''):
            response.headers.setdefault("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response
