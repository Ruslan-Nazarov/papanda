"""Request routing; generation semantics are shared by JSON and SSE routes."""
from contextlib import aclosing

from fastapi_app.services.generation_pipeline import GenerationPipeline


class ConspectusRouter:
    def __init__(self, ai_service, context_builder, sanitizer, rag_manager):
        self.pipeline = GenerationPipeline(ai_service, context_builder, sanitizer, rag_manager)

    async def route_request(self, payload):
        state, locale = payload.get('context_state', {}), payload.get('locale', 'ru')
        result = None
        async with aclosing(self.pipeline.stream_generate_full(
            state, locale, target_step=int(payload['target_step']) if payload['action'] == 'generate_step' else None,
            pinned_step=payload.get('pinned_step'), question=payload.get('question'),
            source_revision=payload.get('source_revision'),
        )) as source:
            async for key, content in source:
                if key == '__terminal__':
                    result = content
        if result is None:
            raise RuntimeError('Generation ended without terminal result')
        return {**result, 'action_status': 'success' if result['status'] == 'completed' else result['status'],
                'cascading_events': []}

    async def _handle_auto_step(self, state, target_step, locale):
        return await self.route_request({'action': 'generate_step', 'context_state': state,
                                         'target_step': target_step, 'locale': locale})

    async def stream_generate_full(self, state, locale, **kwargs):
        async with aclosing(self.pipeline.stream_generate_full(state, locale, **kwargs)) as source:
            async for event in source:
                yield event
