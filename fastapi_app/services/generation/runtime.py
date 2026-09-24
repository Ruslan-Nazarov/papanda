"""One shared budget for all nested attempts, including provider fallback."""
import asyncio
from contextlib import asynccontextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
import json
import logging
import time
import uuid

from fastapi_app.config import settings

logger = logging.getLogger(__name__)
current_run = ContextVar('generation_run', default=None)


class GenerationError(RuntimeError):
    def __init__(self, code, message=None):
        self.code = code
        super().__init__(message or code)


class BudgetExceeded(GenerationError):
    pass


@dataclass
class GenerationContext:
    source_revision: int | None = None
    run_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    started: float = field(default_factory=time.monotonic)
    deadline_seconds: float = field(default_factory=lambda: settings.GENERATION_TIMEOUT)
    max_calls: int = field(default_factory=lambda: settings.GENERATION_MAX_CALLS)
    max_tokens: int = field(default_factory=lambda: settings.GENERATION_MAX_TOKENS)
    calls: list[dict] = field(default_factory=list)
    tokens_reserved: int = 0
    plan: dict = field(default_factory=dict)
    collected: dict = field(default_factory=dict)
    target_step: int | None = None
    status: str = 'failed'

    def remaining(self):
        seconds = self.started + self.deadline_seconds - time.monotonic()
        if seconds <= 0:
            raise BudgetExceeded('deadline', 'Generation deadline exceeded')
        return seconds

    def reserve(self, provider, model, messages, max_tokens, task):
        self.remaining()
        if len(self.calls) >= self.max_calls:
            raise BudgetExceeded('call_budget', 'Generation call budget exhausted')
        # Conservative admission estimate; provider usage remains a separate metric.
        estimate = len(json.dumps(messages, ensure_ascii=False).encode('utf-8')) + 32 * len(messages) + max_tokens
        if self.tokens_reserved + estimate > self.max_tokens:
            raise BudgetExceeded('token_budget', 'Generation token budget exhausted')
        self.tokens_reserved += estimate
        call = {'provider': provider, 'model': model, 'task': task,
                'reserved_tokens': estimate, 'usage_tokens': None, 'status': 'running'}
        self.calls.append(call)
        return call

    def generated_texts(self):
        return {k: v for k, v in self.collected.items()
                if self.target_step is None or k.split('.')[0] == str(self.target_step)}

    def replacement_bases(self):
        return [str(i) for i in range(self.target_step or 1, 6)]

    def metrics(self):
        measured = [c['usage_tokens'] for c in self.calls if c['usage_tokens'] is not None]
        return {'run_id': self.run_id, 'duration_s': round(time.monotonic() - self.started, 3),
                'calls': [dict(c) for c in self.calls], 'call_count': len(self.calls),
                'reserved_tokens': self.tokens_reserved, 'usage_tokens': sum(measured),
                'usage_complete': len(measured) == len(self.calls)}


_slots = None
_slots_loop = None


@asynccontextmanager
async def generation_scope(context=None):
    existing = current_run.get()
    if existing is not None:
        yield existing
        return
    global _slots, _slots_loop
    loop = asyncio.get_running_loop()
    if _slots is None or _slots_loop is not loop:
        _slots, _slots_loop = asyncio.Semaphore(settings.GENERATION_CONCURRENCY), loop
    context = context or GenerationContext()
    token = current_run.set(context)
    try:
        async with asyncio.timeout(context.remaining()):
            async with _slots:
                yield context
    except TimeoutError as error:
        raise BudgetExceeded('deadline', 'Generation deadline exceeded') from error
    except (asyncio.CancelledError, GeneratorExit):
        context.status = 'cancelled'
        raise
    finally:
        current_run.reset(token)
        logger.info('generation finished run_id=%s status=%s duration_s=%.3f calls=%d tokens_reserved=%d',
                    context.run_id, context.status, time.monotonic() - context.started,
                    len(context.calls), context.tokens_reserved)
