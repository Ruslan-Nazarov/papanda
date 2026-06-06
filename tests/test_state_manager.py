import pytest
from datetime import datetime, timedelta
from fastapi_app.services.state_manager import StateManager
from fastapi_app import models


async def _set_active_lang(db_session, lang: str = "en"):
    """Хелпер: сохраняет active_languages в AppSettings для корректной работы метрик."""
    setting = models.AppSettings(key="active_languages", value=lang)
    db_session.add(setting)
    await db_session.commit()


@pytest.mark.anyio
async def test_get_runtime_context_empty(db_session):
    """При пустой БД контекст должен вернуть нулевые метрики."""
    sm = StateManager(db_session)
    stats = await sm.get_runtime_context(force_update=True)
    assert stats["count"] == 0
    assert stats["coverage"] == 0
    assert stats["imw"] == 0
    assert stats["wink"] == "..."


@pytest.mark.anyio
async def test_get_runtime_context_with_data(db_session):
    """
    coverage считается через show_stats: слово «показано» = show_stats[lang] > 0.
    Ставим active_language = "en".
    word1: show_stats={"en": 5} -> показано.
    word2: show_stats={}       -> НЕ показано.
    Ожидаем coverage = 50.0.
    """
    await _set_active_lang(db_session, "en")

    word1 = models.WordStats(
        word="hello", eng="hello", ru="привет", it="ciao", de="hallo",
        count=5, show_stats={"en": 5}, translations={"ru": "привет", "it": "ciao", "de": "hallo"}
    )
    word2 = models.WordStats(
        word="world", eng="world", ru="мир", it="mondo", de="welt",
        count=0, show_stats={}, translations={"ru": "мир", "it": "mondo", "de": "welt"}
    )
    db_session.add(word1)
    db_session.add(word2)

    wink = models.Wink(title="Test Wink", date=datetime.now())
    db_session.add(wink)

    await db_session.commit()

    sm = StateManager(db_session)
    stats = await sm.get_runtime_context(force_update=True)

    assert stats["count"] == 2
    # word1 показано в «en» (show_stats[en]=5), word2 — нет. coverage = 1/2 * 100 = 50.0
    assert stats["coverage"] == 50.0
    assert stats["wink"] == "Test Wink"


@pytest.mark.anyio
async def test_imw_calculation(db_session):
    """
    iMW = (total_lang_shows / (total_count * 80)) * 100.
    active_lang = "en". 10 слов, у каждого show_stats={"en": 8}.
    total_lang_shows = 80, target = 10 * 80 = 800.
    imw = (80 / 800) * 100 = 10.0.
    """
    await _set_active_lang(db_session, "en")

    for i in range(10):
        word = models.WordStats(
            word=f"word{i}", eng=f"word{i}", ru="ru", it="it", de="de",
            count=8, show_stats={"en": 8},
            translations={"ru": "ru", "it": "it", "de": "de"}
        )
        db_session.add(word)
    await db_session.commit()

    sm = StateManager(db_session)
    stats = await sm.get_runtime_context(force_update=True)
    assert stats["imw"] == 10.0
