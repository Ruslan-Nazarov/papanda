import pytest
from fastapi_app.schemas.notes import NoteBlock


def test_legacy_draft_is_normalized_but_unknown_status_is_rejected():
    assert NoteBlock(side='left', status='draft').status == 'in_progress'
    with pytest.raises(ValueError):
        NoteBlock(side='left', status='unknown')


@pytest.mark.asyncio
async def test_single_generated_step_can_be_saved(client):
    from unittest.mock import AsyncMock, MagicMock
    from fastapi_app.services.ai_router_service import ConspectusRouter
    from fastapi_app.services.sanitizer import Sanitizer

    router = ConspectusRouter(MagicMock(), MagicMock(), Sanitizer(), MagicMock())
    router.pipeline.ground = AsyncMock()
    router.pipeline.gen_skeleton = AsyncMock(return_value={'applicable': True, **{f'step{i}': {'thesis': str(i), 'sub_steps': []} for i in range(1, 6)}})
    router.pipeline.regen_process = AsyncMock(return_value='Generated text')
    result = await router._handle_auto_step({'steps': {}}, 3, 'ru')
    step = result['updated_steps']['step3']
    assert step['status'] == 'in_progress'
    saved = await client.post('/api/dialectics/save', json={
        'title': 'Single step', 'blocks': [
            {'side': 'center', 'html': step['content'], 'status': step['status']},
        ],
    })
    assert saved.status_code == 200, saved.text
    assert saved.json()['content_json'][0]['status'] == 'in_progress'
