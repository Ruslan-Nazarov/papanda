import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_app.services.state_manager import StateManager

@pytest.mark.asyncio
async def test_state_manager_concurrency():
    """
    Тестирует, что ContextService с использованием asyncio.Lock 
    предотвращает множественные одновременные обновления.
    """
    mock_db = AsyncMock(spec=AsyncSession)
    sm = StateManager(mock_db) # StateManager delegates to ContextService
    
    update_calls = 0
    
    async def slow_update():
        nonlocal update_calls
        update_calls += 1
        await asyncio.sleep(0.1)
        return {"words": [], "metrics": {}}

    # Patch inside the delegated service
    with patch("fastapi_app.services.context_service.get_setting", AsyncMock(return_value="60")), \
         patch.object(sm.context_service, '_update_runtime_context_from_db', side_effect=slow_update):
        
        tasks = [sm.get_runtime_context(force_update=True) for _ in range(10)]
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 10
        assert update_calls == 10

@pytest.mark.asyncio
async def test_state_manager_lock_serializes_updates():
    """
    Проверяет, что даже при force_update=True запросы стоят в очереди (сериализуются).
    """
    mock_db = AsyncMock(spec=AsyncSession)
    sm = StateManager(mock_db)
    
    execution_order = []
    
    async def mock_update():
        idx = len(execution_order)
        execution_order.append(f"start_{idx}")
        await asyncio.sleep(0.1)
        execution_order.append(f"end_{idx}")
        return {}

    # Patch inside the delegated service
    with patch("fastapi_app.services.context_service.get_setting", AsyncMock(return_value="60")), \
         patch.object(sm.context_service, '_update_runtime_context_from_db', side_effect=mock_update):
        
        await asyncio.gather(
            sm.get_runtime_context(force_update=True),
            sm.get_runtime_context(force_update=True)
        )
        
    assert execution_order == ["start_0", "end_0", "start_2", "end_2"]
