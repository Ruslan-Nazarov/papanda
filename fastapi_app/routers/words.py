from fastapi import APIRouter, Request, Depends, Form, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, delete, text, and_
from typing import Optional, List, Dict, Any, Union
import json
import os
import random
from datetime import datetime, date

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..services.state_manager import StateManager
from ..services.word_service import WordService
from ..dependencies import get_word_service, get_state_manager
from .. import models, schemas
from ..config import templates
from ..logger import logger

router = APIRouter(
    tags=["words"]
)

@router.get("/word_stats", response_class=HTMLResponse)
async def word_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    word_service: WordService = Depends(get_word_service),
    user: Any = Depends(check_auth_dependency),
) -> HTMLResponse:
    """
    Детальная страница статистики слов с графиками.
    
    Args:
        request: FastAPI Request объект.
        db: Асинхронная сессия БД.
        word_service: Сервис для работы со словами.
        user: Текущий пользователь (из зависимости).
        
    Returns:
        HTMLResponse: Отрендеренный шаблон word_stats.html.
    """
    # Получаем все метрики через сервис (учитывает активные языки)
    metrics = await word_service.get_current_metrics()
    total_count = metrics['total_count']
    learned_count = metrics['learned_count']
    coverage = metrics['coverage']
    imw = metrics['imw']
    shown_today = metrics['shown_today']
    today = metrics['today']

    # Языки и их названия
    active_langs = await word_service.get_active_languages()
    lang_names = await word_service.get_all_language_names()

    # Считаем Fully Learned для текущей тройки языков
    fully_learned_count = await word_service.get_fully_learned_count(active_langs)

    # Сохраняем снимок за сегодня (для графиков истории)
    await word_service.save_daily_snapshot(today, coverage, imw, total_count, fully_learned_count)

    # Распределение по уровням
    dist = await word_service.get_distribution_stats()

    # История снимков для графиков
    history_snapshots = await word_service.get_snapshot_history(limit=30)

    # Ежедневная статистика показов (график активности)
    daily_shows = await word_service.get_daily_shows_history(limit=30)

    # Статистика по знаниям для карточек
    known_counts = await word_service.get_knowledge_counts(active_langs)

    # Топ встреченных слов (сортировка по активным языкам)
    top_shown = await word_service.get_top_encountered_words(limit=12)

    def format_date(d: Union[str, date, datetime]) -> str:
        if isinstance(d, str):
            try: return datetime.strptime(d, "%Y-%m-%d").strftime("%d.%m")
            except: return str(d)
        return d.strftime("%d.%m")

    # Карта флагов для языков
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
    """
    Обучающая страница "Language Learning".
    """
    from ..services.note_service import NoteService
    from ..models.notes import Notes
    from sqlalchemy import select
    
    # Инициализируем сервис заметок для работы со стикерами
    ns = NoteService(db)
    
    # Ищем или создаем якорную заметку для стикеров обучения
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
    
    # Читаем предложения из сервиса
    sentences_json = word_service.get_sentences_json()
    
    return templates.TemplateResponse(request, "language_learning.html", {
        "request": request,
        "active_languages": active_langs,
        "all_languages": lang_names,
        "anchor_note_id": anchor_note.id,
        "sentences_json": sentences_json
    })

@router.get("/get_new_words")
async def get_new_words(
    state_manager: StateManager = Depends(get_state_manager)
) -> Dict[str, Any]:
    """Принудительно обновляет и возвращает новые слова (JSON для AJAX)."""
    return await state_manager.get_runtime_context(force_update=True)

@router.get("/refresh_words")
async def refresh_words(
    state_manager: StateManager = Depends(get_state_manager)
) -> RedirectResponse:
    """Принудительное обновление слов, редирект на главную."""
    await state_manager.get_runtime_context(force_update=True)
    return RedirectResponse("/", status_code=303)

@router.get("/get_random_rule")
async def get_random_rule(db: AsyncSession = Depends(get_db)) -> Dict[str, str]:
    """Возвращает случайное языковое правило (JSON для AJAX)."""
    try:
        rule_res = await db.execute(select(models.LanguageRule).order_by(func.random()).limit(1))
        rule = rule_res.scalar_one_or_none()
        if rule:
            return {"language": rule.language, "rule_ru": rule.rule_ru, "rule_en": rule.rule_en}
    except Exception as e:
        logger.error(f"Error fetching random rule: {e}")
    return {"language": "Info", "rule_ru": "Нет правил", "rule_en": "No rules available"}

@router.get("/get_test_words")
async def get_test_words(
    db: AsyncSession = Depends(get_db),
    word_service: WordService = Depends(get_word_service)
) -> Dict[str, Any]:
    """
    5 случайных слов для тестирования (JSON).
    Сразу регистрируем их как показанные для обновления метрик.
    """
    result = await word_service.get_random_test_words_data(limit=5)
    return {"words": result}

@router.post("/mark_word_known", response_model=schemas.SuccessResponse)
async def mark_word_known(
    data: schemas.MarkKnownRequest,
    word_service: WordService = Depends(get_word_service),
):
    """Помечает конкретный язык слова как знакомый (JSON body)."""
    word = await word_service.mark_word_known(data.eng, data.lang, data.is_known)
    if word:
        return schemas.SuccessResponse(message="Word status updated")
    raise HTTPException(status_code=404, detail="Word not found")

@router.post("/record_test_result", response_model=schemas.SuccessResponse)
async def record_test_result(
    data: schemas.TestResultRequest,
    word_service: WordService = Depends(get_word_service),
):
    """Записывает результат теста."""
    await word_service.record_test_result(data.is_correct, data.lang)
    return schemas.SuccessResponse(message="Result recorded")

@router.post("/update_word_data")
async def update_word_data(
    data: schemas.WordUpdateSchema = Depends(schemas.WordUpdateSchema.as_form),
    word_service: WordService = Depends(get_word_service),
) -> RedirectResponse:
    """Обновляет все данные слова (включая динамические языки из формы)."""
    # Собираем все переводы, которые начинаются на 'lang_'
    new_translations = {}
    extra_fields = data.model_extra or {}
    for key, value in extra_fields.items():
        if isinstance(key, str) and key.startswith('lang_'):
            lang_code = key.replace('lang_', '')
            new_translations[lang_code] = value
    
    new_translations['ru'] = data.new_ru
    new_translations['en'] = data.word_eng
    
    await word_service.update_word_full_dynamic(data.word_eng, new_translations, data.new_meaning)
    return RedirectResponse("/?saved=1", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/reset_word_stats", response_model=schemas.SuccessResponse)
async def reset_word_stats(word_service: WordService = Depends(get_word_service)):
    """Обнуляет счётчик показов для всех слов."""
    await word_service.reset_all_stats()
    return schemas.SuccessResponse(message="Stats reset")

@router.post("/mark_triplet_learned", response_model=schemas.SuccessResponse)
async def mark_triplet_learned(
    data: schemas.TripletLearnedRequest,
    word_service: WordService = Depends(get_word_service),
):
    """Помечает активную тройку языков для слова как изученную (JSON body)."""
    word = await word_service.toggle_active_triplet_known(data.eng, data.is_learned)
    if word:
        return schemas.SuccessResponse(message="Triplet status updated")
    raise HTTPException(status_code=404, detail="Word not found")

@router.get("/word_lookup")
async def word_lookup(q: str, word_service: WordService = Depends(get_word_service)) -> Dict[str, Any]:
    """Поиск слов для AJAX подсказок."""
    results = await word_service.search_words(q, limit=10)
    out = []
    active_langs = await word_service.get_active_languages()
    for w in results:
        w_data = {
            "eng": w.eng,
            "ru": w.ru,
            "meaning": w.meaning,
            "count": w.count,
            "show_stats": w.show_stats or {},
            "knowledge_stats": w.knowledge_stats or {},
            "is_learned": w.is_learned,
            "has_any_knowledge": any((w.knowledge_stats or {}).values()),
            "last_shown": w.last_shown.isoformat() if w.last_shown else None,
        }
        # Добавляем все активные языки в корень для удобства фронта
        trans = w.translations or {}
        for l in active_langs:
            w_data[l] = trans.get(l, "")
        out.append(w_data)
    return {"results": out}

@router.post("/upsert_word", response_model=schemas.SuccessResponse)
async def upsert_word(
    data: schemas.WordUpdateSchema = Depends(schemas.WordUpdateSchema.as_form),
    word_service: WordService = Depends(get_word_service),
):
    """Добавляет или обновляет слово (из формы поиска в статистике)."""
    translations = {}
    for key, value in form_data.items():
        if isinstance(key, str) and key.startswith('lang_'):
            lang_code = key.replace('lang_', '')
            translations[lang_code] = value
    
    translations['en'] = eng
    translations['ru'] = ru
    
    word = await word_service.update_word_full_dynamic(eng, translations, meaning)
    if not word:
        word = await word_service.upsert_word_dynamic(eng, translations, meaning)
        
    return {"status": "success", "word": f"{word.eng}" if word else ""}

@router.delete("/delete_word")
async def delete_word(
    eng: str,
    word_service: WordService = Depends(get_word_service),
    user: Any = Depends(check_auth_dependency),
) -> Dict[str, str]:
    """Удаляет слово из базы данных."""
    success = await word_service.delete_word(eng)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete word")
