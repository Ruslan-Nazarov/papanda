import asyncio
from contextlib import aclosing
import json

from fastapi.responses import StreamingResponse
from starlette.requests import ClientDisconnect

from fastapi_app.services.generation.contracts import GenerationEvent, GenerationResult
from fastapi_app.services.generation.runtime import GenerationContext, generation_scope, GenerationError


def sse_response(event_source, *, terminal_required=False, source_revision=None):
    async def event_stream():
        context = GenerationContext(source_revision=source_revision)
        sequence, terminal, received = 0, False, False

        def encode(kind, **payload):
            nonlocal sequence
            sequence += 1
            event = GenerationEvent(type=kind, run_id=context.run_id, sequence=sequence, **payload)
            return f'data: {json.dumps(event.model_dump(), ensure_ascii=False)}\n\n'

        yield encode('started', source_revision=source_revision)
        try:
            async with generation_scope(context):
                async with aclosing(event_source) as source:
                    async for event in source:
                        if terminal:
                            raise GenerationError('invalid_stream', 'Content after terminal event')
                        if 'result' in event:
                            result = GenerationResult.model_validate(event['result'])
                            if result.run_id != context.run_id:
                                raise GenerationError('invalid_stream', 'Mismatched run ID')
                            terminal = True
                            context.status = result.status
                            yield encode('terminal', done=True, status=result.status, result=result.model_dump())
                        else:
                            kind = next((key for key in ('delta', 'status', 'step', 'titles', 'note_meta', 'report', 'not_applicable')
                                         if key in event), None)
                            if kind is None:
                                raise GenerationError('invalid_stream', 'Unknown generation event')
                            received |= kind in {'delta', 'step'}
                            yield encode(kind, **event)
                if terminal_required and not terminal:
                    raise GenerationError('incomplete_stream', 'Generation ended without terminal result')
                if not terminal:
                    if not received:
                        raise GenerationError('empty_response', 'No text received')
                    context.status = 'completed'
                    terminal = True
                    yield encode('terminal', done=True, status='completed', report=context.metrics())
        except (asyncio.CancelledError, GeneratorExit):
            context.status = 'cancelled'
            raise
        except Exception as error:
            if not terminal:
                context.status = 'partial' if received or context.generated_texts() else 'failed'
                result = GenerationResult(
                    run_id=context.run_id, source_revision=source_revision, status=context.status,
                    error_message=str(error) if isinstance(error, GenerationError) else 'Generation interrupted',
                    updated_steps={f'step{k}': {'content': v, 'status': 'in_progress', 'author': 'ai'}
                                   for k, v in context.generated_texts().items()},
                    replace_bases=context.replacement_bases(),
                    report=context.metrics(),
                )
                yield encode('terminal', done=True, status=result.status, result=result.model_dump())
    return StreamingResponse(event_stream(), media_type='text/event-stream',
                             headers={'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no'})


async def until_disconnect(request, operation):
    """Cancel non-stream work when its HTTP client leaves."""
    work = asyncio.create_task(operation)

    async def watch():
        while not await request.is_disconnected():
            await asyncio.sleep(0.1)

    watcher = asyncio.create_task(watch())
    try:
        finished, _ = await asyncio.wait((work, watcher), return_when=asyncio.FIRST_COMPLETED)
        if work in finished:
            return await work
        raise ClientDisconnect()
    finally:
        for task in (work, watcher):
            if not task.done():
                task.cancel()
        await asyncio.gather(work, watcher, return_exceptions=True)
