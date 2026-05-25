from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from typing import Any, Dict

from ...database import get_db
from ...services.auth import check_auth_dependency
from ...services.state_manager import StateManager
from ...services.word_service import WordService
from ...dependencies import get_word_service, get_state_manager
from ... import models, schemas
from ...logger import logger

router = APIRouter()

@router.get("/get_new_words")
async def get_new_words(
    state_manager: StateManager = Depends(get_state_manager)
) -> Dict[str, Any]:
    """Принудительно обновляет и возвращает новые слова."""
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
    """Возвращает случайное языковое правило."""
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
    limit: int = 5,
    max_known: int = 1,
    word_service: WordService = Depends(get_word_service)
) -> Dict[str, Any]:
    """Случайные слова для тестирования."""
    result = await word_service.get_random_test_words_data(limit=limit, max_known=max_known)
    return {"words": result}

@router.post("/mark_word_known", response_model=schemas.SuccessResponse)
async def mark_word_known(
    data: schemas.MarkKnownRequest,
    word_service: WordService = Depends(get_word_service),
):
    """Помечает конкретный язык слова как знакомый."""
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
    """Обновляет все данные слова."""
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
    state_manager: StateManager = Depends(get_state_manager),
):
    """Помечает активную тройку языков для слова как изученную."""
    word = await word_service.toggle_active_triplet_known(data.eng, data.is_learned)
    if word:
        if data.is_learned:
            await state_manager.remove_word_from_cache(data.eng)
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
            "eng": w.eng, "ru": w.ru, "meaning": w.meaning, "count": w.count,
            "show_stats": w.show_stats or {}, "knowledge_stats": w.knowledge_stats or {},
            "is_learned": w.is_learned, "has_any_knowledge": any((w.knowledge_stats or {}).values()),
            "last_shown": w.last_shown.isoformat() if w.last_shown else None,
        }
        trans = w.translations or {}
        for l in active_langs:
            w_data[l] = trans.get(l, "")
        out.append(w_data)
    return {"results": out}

@router.post("/upsert_word")
async def upsert_word(
    data: schemas.WordUpdateSchema = Depends(schemas.WordUpdateSchema.as_form),
    word_service: WordService = Depends(get_word_service),
):
    """Добавляет или обновляет слово."""
    translations = {}
    extra_fields = data.model_extra or {}
    for key, value in extra_fields.items():
        if isinstance(key, str) and key.startswith('lang_'):
            translations[key.replace('lang_', '')] = value
    
    translations['en'] = data.word_eng
    translations['ru'] = data.new_ru
    
    word = await word_service.update_word_full_dynamic(data.word_eng, translations, data.new_meaning)
    if not word:
        word = await word_service.upsert_word_dynamic(data.word_eng, translations, data.new_meaning)
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
    raise HTTPException(status_code=500, detail="Failed to delete word")
