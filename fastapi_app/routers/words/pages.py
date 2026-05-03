from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Union
from datetime import datetime, date

from ...services.auth import check_auth_dependency
from ...database import get_db
from ...services.word_service import WordService
from ...dependencies import get_word_service
from ...config import templates

router = APIRouter()

@router.get("/word_stats", response_class=HTMLResponse)
async def word_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    word_service: WordService = Depends(get_word_service),
    user: Any = Depends(check_auth_dependency),
) -> HTMLResponse:
    """Детальная страница статистики слов с графиками."""
    metrics = await word_service.get_current_metrics()
    total_count = metrics['total_count']
    learned_count = metrics['learned_count']
    coverage = metrics['coverage']
    imw = metrics['imw']
    shown_today = metrics['shown_today']
    today = metrics['today']

    active_langs = await word_service.get_active_languages()
    lang_names = await word_service.get_all_language_names()
    fully_learned_count = await word_service.get_fully_learned_count(active_langs)

    await word_service.save_daily_snapshot(today, coverage, imw, total_count, fully_learned_count)

    dist = await word_service.get_distribution_stats()
    history_snapshots = await word_service.get_snapshot_history(limit=30)
    daily_shows = await word_service.get_daily_shows_history(limit=30)
    known_counts = await word_service.get_knowledge_counts(active_langs)
    top_shown = await word_service.get_top_encountered_words(limit=12)

    def format_date(d: Union[str, date, datetime]) -> str:
        if isinstance(d, str):
            try: return datetime.strptime(d, "%Y-%m-%d").strftime("%d.%m")
            except: return str(d)
        return d.strftime("%d.%m")

    language_flags = {
        'en': '🇺🇸', 'it': '🇮🇹', 'de': '🇩🇪', 'ru': '🇷🇺', 
        'fr': '🇫🇷', 'es': '🇪🇸', 'tr': '🇹🇷', 'kz': '🇰🇿'
    }

    return templates.TemplateResponse(request, "word_stats.html", {
        "request": request,
        "total_count": total_count,
        "learned_count": learned_count,
        "fully_learned_count": fully_learned_count,
        "known_counts": known_counts,
        "active_languages": active_langs,
        "all_languages": lang_names,
        "language_flags": language_flags,
        "coverage": coverage,
        "imw": imw,
        "shown_today": shown_today,
        "today_for_calendar": today,
        "distribution": dist,
        "history_labels": [format_date(s.date) for s in history_snapshots],
        "history_total": [int(s.total_count or 0) for s in history_snapshots],
        "history_learned": [int(s.fully_learned_count or 0) for s in history_snapshots],
        "history_total_tests": [
            sum(v.get("total", 0) for v in s.test_stats_json.values()) if s.test_stats_json else 0 
            for s in history_snapshots
        ],
        "history_total_success": [
            sum(v.get("success", 0) for v in s.test_stats_json.values()) if s.test_stats_json else 0 
            for s in history_snapshots
        ],
        "history_retention": [
            round((sum(v.get("success", 0) for v in s.test_stats_json.values()) / sum(v.get("total", 0) for v in s.test_stats_json.values()) * 100), 1)
            if s.test_stats_json and sum(v.get("total", 0) for v in s.test_stats_json.values()) > 0 else 0
            for s in history_snapshots
        ],
        "history_lang_success": {
            lang: [
                int(s.test_stats_json.get(lang, {}).get("success", 0)) if s.test_stats_json and lang in s.test_stats_json else 0
                for s in history_snapshots
            ]
            for lang in active_langs
        },
        "history_lang_retention": {
            lang: [
                round((s.test_stats_json.get(lang, {}).get("success", 0) / s.test_stats_json.get(lang, {}).get("total", 1) * 100), 1)
                if s.test_stats_json and lang in s.test_stats_json and s.test_stats_json[lang].get("total", 0) > 0
                else 0
                for s in history_snapshots
            ]
            for lang in active_langs
        },
        "history_coverage": [float(s.coverage) for s in history_snapshots],
        "history_imw": [float(s.imw) for s in history_snapshots],
        "top_shown": top_shown,
        "daily_shows_labels": [format_date(s.date) for s in daily_shows],
        "daily_shows_data": [int(s.shows_count) for s in daily_shows],
    })

@router.get("/language_learning", response_class=HTMLResponse)
async def language_learning(
    request: Request,
    db: AsyncSession = Depends(get_db),
    word_service: WordService = Depends(get_word_service),
    user: Any = Depends(check_auth_dependency),
) -> HTMLResponse:
    """Обучающая страница "Language Learning"."""
    from ..services.note_service import NoteService
    from ..models.notes import Notes
    from sqlalchemy import select
    
    ns = NoteService(db)
    result = await db.execute(select(Notes).where(Notes.category == "Language Learning System"))
    anchor_note = result.scalars().first()
    
    if not anchor_note:
        anchor_note = Notes(
            category="Language Learning System", 
            note="Системный якорь для стикеров на странице изучения языка."
        )
        db.add(anchor_note)
        await db.commit()
        await db.refresh(anchor_note)
    
    active_langs = await word_service.get_active_languages()
    lang_names = await word_service.get_all_language_names()
    sentences_json = word_service.get_sentences_json()
    
    return templates.TemplateResponse(request, "language_learning.html", {
        "request": request,
        "active_languages": active_langs,
        "all_languages": lang_names,
        "anchor_note_id": anchor_note.id,
        "sentences_json": sentences_json
    })
