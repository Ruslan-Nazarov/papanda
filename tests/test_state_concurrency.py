import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_app.services.state_manager import StateManager

@pytest.mark.asyncio
async def test_state_manager_concurrency():
    """
    Тестирует, что StateManager с использованием asyncio.Lock 
    предотвращает множественные одновременные обновления.
    """
    mock_db = AsyncMock(spec=AsyncSession)
    sm = StateManager(mock_db)
    
    # Мокаем _update_runtime_context_from_db, чтобы он "работал" какое-то время
    update_calls = 0
    
    async def slow_update():
        nonlocal update_calls
        update_calls += 1
        await asyncio.sleep(0.1) # Имитация работы
        return {"words": [], "metrics": {}}

    # Мокаем get_setting, чтобы избежать реальных вызовов к БД и RuntimeWarning
    with patch("fastapi_app.services.state_manager.get_setting", AsyncMock(return_value="60")), \
         patch.object(sm, '_update_runtime_context_from_db', side_effect=slow_update):
        
        # Запускаем сразу 10 запросов одновременно
        tasks = [sm.get_runtime_context(force_update=True) for _ in range(10)]
        results = await asyncio.gather(*tasks)
        
        # Проверяем, что обновление было вызвано ровно 10 раз
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

    # Мокаем get_setting, чтобы избежать реальных вызовов к БД и RuntimeWarning
    with patch("fastapi_app.services.state_manager.get_setting", AsyncMock(return_value="60")), \
         patch.object(sm, '_update_runtime_context_from_db', side_effect=mock_update):
        
        await asyncio.gather(
            sm.get_runtime_context(force_update=True),
            sm.get_runtime_context(force_update=True)
        )
        
    # Если Lock работает, порядок должен быть строго [start_0, end_0, start_1, end_1]
    # (или start_X, end_X, start_Y, end_Y, но так как мы используем len(execution_order), 
    # вторая итерация увидит len=2 и будет start_2, end_2)
    # На самом деле, start_0, end_0, then start_2, end_3?
    # Давайте проверим логику:
    # 1. Первый зашел, idx=0, append "start_0", спит 0.1
    # 2. Второй ждет лока.
    # 3. Первый проснулся, append "end_0", выходит.
    # 4. Второй зашел, idx=len(["start_0", "end_0"]) = 2, append "start_2", спит 0.1
    # 5. Второй проснулся, append "end_2", выходит.
    
    # Таким образом, ожидаем ["start_0", "end_0", "start_2", "end_2"]
    assert execution_order == ["start_0", "end_0", "start_2", "end_2"]
