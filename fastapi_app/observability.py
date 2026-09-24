"""Bounded JSON events. Request bodies, queries, tokens and exception text are excluded."""
import json
import logging
import os
from pathlib import Path
import time
from datetime import datetime, timezone

FIELDS = ('event', 'run_id', 'status', 'duration_s', 'calls', 'tokens_reserved', 'method', 'route')


def release_ready():
    filename = os.getenv('PAPANDA_READY_FILE')
    if not filename:
        return True
    from fastapi_app.version import RELEASE_SHA
    try:
        return json.loads(Path(filename).read_text())['revision'] == RELEASE_SHA
    except (OSError, ValueError, KeyError):
        return False


class ReleaseReadinessMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'http' and not release_ready():
            path = scope['path']
            if scope['method'] != 'GET' or (path not in {'/health', '/'} and not path.startswith('/static/')):
                from starlette.responses import JSONResponse
                return await JSONResponse({'detail': 'Release is starting; retry shortly'}, 503,
                                          headers={'Retry-After': '5'})(scope, receive, send)
        return await self.app(scope, receive, send)


class JsonFormatter(logging.Formatter):
    def format(self, record):
        data = {'time': datetime.now(timezone.utc).isoformat(), 'level': record.levelname,
                'logger': record.name, 'event': getattr(record, 'event', 'server_log')}
        for key in FIELDS:
            if hasattr(record, key):
                data[key] = getattr(record, key)
        if record.exc_info and record.exc_info[0]:
            data['error_type'] = record.exc_info[0].__name__
        return json.dumps(data, ensure_ascii=False)


LOG_CONFIG = {'version': 1, 'disable_existing_loggers': False,
              'formatters': {'json': {'()': JsonFormatter}},
              'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'json'}},
              'root': {'handlers': ['console'], 'level': 'INFO'},
              'loggers': {name: {'handlers': [], 'propagate': True, 'level': level}
                          for name, level in [('uvicorn', 'INFO'), ('uvicorn.error', 'INFO'),
                                              ('uvicorn.access', 'WARNING'), ('httpx', 'WARNING'),
                                              ('httpcore', 'WARNING'), ('openai', 'WARNING')]}}


class RequestMetricsMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        started, status = time.monotonic(), 500

        async def capture(message):
            nonlocal status
            if message['type'] == 'http.response.start':
                status = message['status']
            await send(message)

        try:
            await self.app(scope, receive, capture)
        finally:
            route = getattr(scope.get('route'), 'path', None) or 'unmatched'
            logging.getLogger('fastapi_app.requests').info('request', extra={
                'event': 'request', 'method': scope['method'], 'route': route,
                'status': status, 'duration_s': round(time.monotonic() - started, 4)})
