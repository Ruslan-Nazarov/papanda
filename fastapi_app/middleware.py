import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class SessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        session_id = request.cookies.get("session_id")
        if not session_id:
            session_id = str(uuid.uuid4())
            response.set_cookie(
                key="session_id",
                value=session_id,
                httponly=True,
                max_age=30 * 24 * 60 * 60, # 30 days
                samesite="lax"
            )
            request.state.session_id = session_id
            
        return response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Adjusted CSP to allow CDN scripts/styles used by the app (TiPTap, KaTeX, D3, Fabric) and WebSockets for analytics
        response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: ws: wss: data: blob:;"
        return response

class LocaleMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        locale = request.cookies.get("locale")
        if not locale:
            accept_lang = request.headers.get("Accept-Language", "").lower()
            primary_lang = accept_lang.split(",")[0][:2] if accept_lang else "en"
            
            if primary_lang == "ru":
                locale = "ru"
            elif primary_lang == "kk" or primary_lang == "kz":
                locale = "kz"
            else:
                locale = "en"
        request.state.locale = locale
        return await call_next(request)

class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response
