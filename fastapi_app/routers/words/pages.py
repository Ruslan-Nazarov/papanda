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

@router.get("/api/words/stats_modal", response_class=HTMLResponse)
async def word_stats_modal(
    request: Request,
    db: AsyncSession = Depends(get_db),
    word_service: WordService = Depends(get_word_service),
    user: Any = Depends(check_auth_dependency),
) -> HTMLResponse:
    """API endpoint to load the word stats modal content."""
    metrics = await word_service.get_current_metrics()
    total_count = metrics['total_count']
    learned_count = metrics['learned_count']
    coverage = metrics['coverage']
    imw = metrics['imw']
    shown_today = metrics['shown_today']
    today = metrics['today']
    coverage_by_lang = metrics.get('coverage_by_lang', {})
    imw_by_lang = metrics.get('imw_by_lang', {})
    learned_count_by_lang = metrics.get('learned_count_by_lang', {})

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
        'en': '🇬🇧', 'it': '🇮🇹', 'de': '🇩🇪', 'ru': '🇷🇺', 
        'fr': '🇫🇷', 'es': '🇪🇸', 'tr': '🇹🇷', 'kz': '🇰🇿'
    }

    def parse_snap_stats(snap) -> dict:
        raw = snap.test_stats_json
        if not raw: return {}
        if isinstance(raw, str):
            import json
            try: return json.loads(raw)
            except Exception: return {}
        return dict(raw)

    parsed_stats = [parse_snap_stats(s) for s in history_snapshots]

    response = templates.TemplateResponse(request, "partials/modals/_word_stats_content.html", {
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
        "coverage_by_lang": coverage_by_lang,
        "imw_by_lang": imw_by_lang,
        "learned_count_by_lang": learned_count_by_lang,
        "today_for_calendar": today,
        "distribution": dist,
        "history_labels": [format_date(s.date) for s in history_snapshots],
        "history_total": [int(s.total_count or 0) for s in history_snapshots],
        "history_learned": [int(s.fully_learned_count or 0) for s in history_snapshots],
        "history_total_tests": [
            sum(v.get("total", 0) for v in st.values()) if st else 0 
            for st in parsed_stats
        ],
        "history_total_success": [
            sum(v.get("success", 0) for v in st.values()) if st else 0 
            for st in parsed_stats
        ],
        "history_retention": [
            round((sum(v.get("success", 0) for v in st.values()) / sum(v.get("total", 0) for v in st.values()) * 100), 1)
            if st and sum(v.get("total", 0) for v in st.values()) > 0 else 0
            for st in parsed_stats
        ],
        "history_lang_success": {
            lang: [
                int(st.get(lang, {}).get("success", 0)) if st and lang in st else 0
                for st in parsed_stats
            ]
            for lang in active_langs
        },
        "history_lang_retention": {
            lang: [
                round((st.get(lang, {}).get("success", 0) / st.get(lang, {}).get("total", 1) * 100), 1)
                if st and lang in st and st[lang].get("total", 0) > 0
                else 0
                for st in parsed_stats
            ]
            for lang in active_langs
        },
        "history_coverage": [float(s.coverage) for s in history_snapshots],
        "history_imw": [float(s.imw) for s in history_snapshots],
        "top_shown": top_shown,
        "daily_shows_labels": [format_date(s.date) for s in daily_shows],
        "daily_shows_data": [int(s.shows_count) for s in daily_shows],
    })
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response

@router.get("/language_learning", response_class=HTMLResponse)
async def language_learning(
    request: Request,
    db: AsyncSession = Depends(get_db),
    word_service: WordService = Depends(get_word_service),
    user: Any = Depends(check_auth_dependency),
) -> HTMLResponse:
    """Обучающая страница "Language Learning"."""
    active_langs = await word_service.get_active_languages()
    lang_names = await word_service.get_all_language_names()
    sentences_json = word_service.get_sentences_json()
    
    import json
    try:
        sentences = json.loads(sentences_json)
        sentence_langs = set(s.get("language") for s in sentences if s.get("language"))
    except Exception:
        sentence_langs = set()
        
    result = await db.execute(select(Notes).where(Notes.category == "Language Learning System"))
    anchor_notes = result.scalars().all()
    lang_anchors = {note.note: note.id for note in anchor_notes}
    
    for lang in sentence_langs:
        if lang not in lang_anchors:
            new_anchor = Notes(
                category="Language Learning System",
                note=lang
            )
            db.add(new_anchor)
            await db.commit()
            await db.refresh(new_anchor)
            lang_anchors[lang] = new_anchor.id
    
    return templates.TemplateResponse(request, "language_learning.html", {
        "request": request,
        "active_languages": active_langs,
        "all_languages": lang_names,
        "lang_anchors_json": json.dumps(lang_anchors),
        "sentences_json": sentences_json
    })
