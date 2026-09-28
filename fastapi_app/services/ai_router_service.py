"""Request routing; generation semantics are shared by JSON and SSE routes."""
from contextlib import aclosing

from fastapi_app.config import settings
from fastapi_app.services.generation_pipeline import GenerationPipeline
from fastapi_app.services.generation.dialectic_v3_pipeline import DialecticV3Pipeline


class ConspectusRouter:
    def __init__(self, ai_service, context_builder, sanitizer, rag_manager):
        self.pipeline = GenerationPipeline(ai_service, context_builder, sanitizer, rag_manager)
        # generate_step / pinned-step clarify / reference-document RAG grounding always use the
        # legacy pipeline (see dialectic_v3_pipeline's own module docstring for why); only a full,
        # fresh generation can use the alternate engine, gated by GENERATION_ENGINE.
        self.full_pipeline = (DialecticV3Pipeline(ai_service, context_builder, sanitizer, rag_manager)
                              if settings.GENERATION_ENGINE == 'dialectic_v3' else self.pipeline)

    async def route_request(self, payload):
        state, locale = payload.get('context_state', {}), payload.get('locale', 'ru')
        pipeline = self.pipeline if payload['action'] == 'generate_step' else self.full_pipeline
        result = None
        async with aclosing(pipeline.stream_generate_full(
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
        async with aclosing(self.full_pipeline.stream_generate_full(state, locale, **kwargs)) as source:
            async for event in source:
                yield event
