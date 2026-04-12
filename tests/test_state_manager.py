import pytest
from datetime import datetime, timedelta
from fastapi_app.services.state_manager import get_runtime_context
from fastapi_app import models

@pytest.mark.anyio
async def test_get_runtime_context_empty(db_session):
    # force_update=True to avoid returning '...' for wink
    stats = await get_runtime_context(db_session, force_update=True)
    assert stats["count"] == 0
    assert stats["coverage"] == 0
    assert stats["imw"] == 0
    assert stats["wink"] == "..."

@pytest.mark.anyio
async def test_get_runtime_context_with_data(db_session):
    # Add some words
    word1 = models.WordStats(word="hello", eng="hello", ru="привет", it="ciao", de="hallo", count=5)
    word2 = models.WordStats(word="world", eng="world", ru="мир", it="mondo", de="welt", count=0)
    db_session.add(word1)
    db_session.add(word2)
    
    # Add a wink
    wink = models.Wink(title="Test Wink", date=datetime.now())
    db_session.add(wink)
    
    await db_session.commit()
    
    # Calculation happens BEFORE incrementing counts for selected words
    stats = await get_runtime_context(db_session, force_update=True)
    assert stats["count"] == 2
    # word1 (5) is learned, word2 (0) is not. coverage = 1/2 = 50%
    assert stats["coverage"] == 50.0
    assert stats["wink"] == "Test Wink"

@pytest.mark.anyio
async def test_imw_calculation(db_session):
    # iMW = (total_shows / (total_count * 80)) * 100
    # Calculation happens BEFORE incrementing counts
    for i in range(10):
        word = models.WordStats(word=f"word{i}", eng=f"word{i}", ru="ru", it="it", de="de", count=8)
        db_session.add(word)
    await db_session.commit()
    
    # total_count = 10, total_shows = 80. target_shows = 800. imw = 10.0
    stats = await get_runtime_context(db_session, force_update=True)
    assert stats["imw"] == 10.0
