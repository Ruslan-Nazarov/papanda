import pytest
from sqlalchemy import select, inspect
from datetime import datetime
from fastapi_app import models

@pytest.mark.anyio
async def test_all_models_registered(db_session):
    """
    Проверяет, что все ожидаемые модели зарегистрированы и для них созданы таблицы.
    Это защищает от ошибок разделения моделей по пакетам (AttributeError).
    """
    expected_models = [
        "User", "Event", "Chronology", "Task", "Habit", "HabitsDone", 
        "Notes", "NoteCategory", "StickyNote", 
        "WordStats", "WordStatsSnapshot", "WordShowsDaily", "Wink",
        "Dashboard", "AppSettings", "LanguageRule",
        "Observation", "ObservationLog"
    ]
    
    # Получаем список всех зарегистрированных таблиц через инспектор (синхронно через run_sync)
    def get_tables(connection):
        return inspect(connection).get_table_names()
    
    async with db_session.bind.connect() as conn:
        tables = await conn.run_sync(get_tables)
        
    # Проверяем наличие моделей в пакете fastapi_app.models
    for model_name in expected_models:
        assert hasattr(models, model_name), f"Model {model_name} is missing from fastapi_app.models package!"
        
        # Проверяем, что для модели есть таблица (упрощенная проверка имен)
        model_class = getattr(models, model_name)
        table_name = model_class.__tablename__
        assert table_name in tables, f"Table for model {model_name} (expected {table_name}) not found in DB!"

@pytest.mark.anyio
async def test_model_basic_ops(db_session):
    """
    Проверяет базовые операции (создание, чтение) для основных моделей.
    """
    # 1. Chronology (наш недавний проблемный случай)
    chrono = models.Chronology(title="Test Chronology", date=datetime.now())
    db_session.add(chrono)
    
    # 2. StickyNote
    note = models.StickyNote(text="Test Note", color="#ffffff", type="text")
    db_session.add(note)
    
    # 3. WordStats
    word = models.WordStats(word="test", eng="test", ru="тест", it="test", de="test", count=0)
    db_session.add(word)
    
    await db_session.commit()
    
    # Проверяем чтение
    res = await db_session.execute(select(models.Chronology))
    assert res.scalars().first().title == "Test Chronology"
    
    res = await db_session.execute(select(models.StickyNote))
    assert res.scalars().first().text == "Test Note"
