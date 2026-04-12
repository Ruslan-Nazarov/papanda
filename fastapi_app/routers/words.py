from fastapi import APIRouter, Request, Depends, Form, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, delete
import random
from datetime import datetime

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..services.state_manager import get_runtime_context
from ..services.word_service import WordService
from ..dependencies import get_word_service
from .. import models
from ..config import templates
from ..logger import logger

router = APIRouter(
    tags=["words"]
)


@router.get("/word_stats", response_class=HTMLResponse)
async def word_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(check_auth_dependency),
):
    """Детальная страница статистики слов с графиками."""
    try:
        total_count_res = await db.execute(select(func.count(models.WordStats.word)))
        total_count = total_count_res.scalar() or 0

        learned_count_res = await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.count > 0))
        learned_count = learned_count_res.scalar() or 0

        total_shows_res = await db.execute(select(func.sum(models.WordStats.count)))
        total_shows = total_shows_res.scalar() or 0

        coverage = round((learned_count / total_count) * 100, 2) if total_count > 0 else 0
        target_shows = total_count * 80
        imw = round((total_shows / target_shows) * 100, 2) if target_shows > 0 else 0

        # Сохраняем/обновляем снимок дня
        today = datetime.now().date()
        snap_res = await db.execute(select(models.WordStatsSnapshot).where(models.WordStatsSnapshot.date == today))
        snap = snap_res.scalar_one_or_none()
        if snap:
            snap.coverage = coverage
            snap.imw = imw
        else:
            db.add(models.WordStatsSnapshot(date=today, coverage=coverage, imw=imw))
        await db.commit()

        # shown_today будет взят из word_shows_daily ниже, после его загрузки

        dist = {
            "New (0)": (await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.count == 0))).scalar() or 0,
            "Beginner (1-5)": (await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.count >= 1, models.WordStats.count <= 5))).scalar() or 0,
            "Intermediate (6-15)": (await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.count >= 6, models.WordStats.count <= 15))).scalar() or 0,
            "Advanced (16-40)": (await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.count >= 16, models.WordStats.count <= 40))).scalar() or 0,
            "Expert (41-80)": (await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.count >= 41, models.WordStats.count <= 80))).scalar() or 0,
            "Master (80+)": (await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.count > 80))).scalar() or 0,
        }

        history_snapshots_res = await db.execute(select(models.WordStatsSnapshot).order_by(models.WordStatsSnapshot.date).limit(30))
        history_snapshots = history_snapshots_res.scalars().all()

        # Ежедневная статистика показов слов (последние 30 дней)
        daily_shows_res = await db.execute(
            select(models.WordShowsDaily)
            .order_by(models.WordShowsDaily.date)
            .limit(30)
        )
        daily_shows = daily_shows_res.scalars().all()

        # Берём показы за сегодня из того же источника, что и график
        today_daily = next((d for d in daily_shows if d.date == today), None)
        shown_today = today_daily.shows_count if today_daily else 0

        top_shown_res = await db.execute(select(models.WordStats).order_by(models.WordStats.count.desc()).limit(12))
        top_shown = top_shown_res.scalars().all()

        known_en = (await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.is_known_en == True))).scalar() or 0
        known_it = (await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.is_known_it == True))).scalar() or 0
        known_de = (await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.is_known_de == True))).scalar() or 0

        def format_date(d):
            if isinstance(d, str):
                try:
                    return datetime.strptime(d, "%Y-%m-%d").strftime("%d.%m")
                except:
                    return str(d)
            return d.strftime("%d.%m")

        history_labels = [format_date(s.date) for s in history_snapshots]
        history_coverage = [float(s.coverage) for s in history_snapshots]
        history_imw = [float(s.imw) for s in history_snapshots]
        
        daily_shows_labels = [format_date(s.date) for s in daily_shows]
        daily_shows_data = [int(s.shows_count) for s in daily_shows]

        fully_learned_count_res = await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.is_learned == True))
        fully_learned_count = fully_learned_count_res.scalar() or 0

        return templates.TemplateResponse("word_stats.html", {
            "request": request,
            "total_count": total_count,
            "learned_count": learned_count,
            "fully_learned_count": fully_learned_count,
            "known_en": known_en,
            "known_it": known_it,
            "known_de": known_de,
            "coverage": coverage,
            "imw": imw,
            "shown_today": shown_today,
            "today_for_calendar": today,
            "distribution": dist,
            "history_labels": history_labels,
            "history_coverage": history_coverage,
            "history_imw": history_imw,
            "top_shown": top_shown,
            "daily_shows_labels": daily_shows_labels,
            "daily_shows_data": daily_shows_data,
        })
    except Exception as e:
        logger.error(f"Error in word_stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/get_new_words")
async def get_new_words(db: AsyncSession = Depends(get_db)):
    """Принудительно обновляет и возвращает новые слова (JSON для AJAX)."""
    return await get_runtime_context(db, force_update=True)


@router.get("/refresh_words")
async def refresh_words(db: AsyncSession = Depends(get_db)):
    """Принудительное обновление слов, редирект на главную."""
    await get_runtime_context(db, force_update=True)
    return RedirectResponse("/", status_code=303)


@router.get("/get_random_rule")
async def get_random_rule(db: AsyncSession = Depends(get_db)):
    """Возвращает случайное языковое правило (JSON для AJAX)."""
    try:
        rule_res = await db.execute(select(models.LanguageRule).order_by(func.random()).limit(1))
        rule = rule_res.scalar_one_or_none()
        if rule:
            return {"language": rule.language, "rule_ru": rule.rule_ru, "rule_en": rule.rule_en}
    except Exception as e:
        pass
    return {"language": "Info", "rule_ru": "Нет правил", "rule_en": "No rules available"}


@router.get("/get_test_words")
async def get_test_words(word_service: WordService = Depends(get_word_service)):
    """5 случайных слов для тестирования (JSON). Сразу учитываем их как показанные."""
    logger.info("get_test_words endpoint called")
    words = await word_service.get_random_words(5)
    
    # Сразу регистрируем показы для всех выбранных слов в базе
    await word_service.record_word_shows(words)
    
    langs = ["eng", "it", "de"]
    result = []
    for w in words:
        # Фильтруем языки: перевод должен существовать и язык не должен быть помечен как известный
        available_langs = [
            l for l in langs 
            if getattr(w, l) and str(getattr(w, l)).strip() 
            and not getattr(w, f"is_known_{'en' if l == 'eng' else l}", False)
        ]
        
        # Если нет переводов вообще, пропустим это слово (или выберем из всех как фоллбэк)
        lang = random.choice(available_langs) if available_langs else random.choice(langs)
        
        result.append({
            "eng": w.eng,
            "word_to_test": getattr(w, lang, "..."),
            "ru": w.ru,
            "it": w.it,
            "de": w.de,
            "test_lang": lang,
            "count": w.count, # w.count уже увеличен в record_word_shows
        })
    logger.info(f"get_test_words returning {len(result)} words")
    return {"words": result}


@router.post("/mark_word_known")
async def mark_word_known(
    request: Request,
    word_service: WordService = Depends(get_word_service),
):
    """Помечает конкретный язык слова как знакомый (JSON body)."""
    try:
        data = await request.json()
        eng = data.get("eng")
        lang = data.get("lang")
        is_known = data.get("is_known", True)

        if not eng or not lang:
            logger.warning("mark_word_known called with missing eng/lang")
            return JSONResponse(status_code=400, content={"status": "error", "message": "Missing eng or lang"})

        logger.info(f"mark_word_known: eng={eng}, lang={lang}, is_known={is_known}")
        word = await word_service.mark_word_known(eng, lang, is_known)
        if word:
            db_lang = "en" if lang == "eng" else lang
            field_name = f"is_known_{db_lang}"
            return {
                "status": "success",
                "field": field_name,
                "is_known": getattr(word, field_name, False)
            }
        return JSONResponse(status_code=404, content={"status": "error", "message": "Word not found"})
    except Exception as e:
        logger.error(f"Error in mark_word_known: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/record_test_result")
async def record_test_result(
    request: Request,
    word_service: WordService = Depends(get_word_service),
):
    """Записывает результат теста для слова (JSON body). Пока просто заглушка, так как показы считаются в get_test_words."""
    try:
        data = await request.json()
        eng = data.get("eng")
        is_correct = data.get("is_correct", False)

        if not eng:
            logger.warning("record_test_result called with missing eng")
            return JSONResponse(status_code=400, content={"status": "error", "message": "Missing eng"})

        logger.info(f"record_test_result: eng={eng}, is_correct={is_correct}")
        # Счетчик показов теперь увеличивается в get_test_words, 
        # поэтому здесь мы просто возвращаем успех.
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error in record_test_result: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/update_word_data")
async def update_word_data(
    word_eng: str = Form(...),
    new_it: str = Form(""),
    new_de: str = Form(""),
    new_ru: str = Form(...),
    new_meaning: str = Form(""),
    word_service: WordService = Depends(get_word_service),
):
    """Обновляет все данные слова."""
    await word_service.update_word_full(word_eng, new_it, new_de, new_ru, new_meaning)
    return RedirectResponse("/?saved=1", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/reset_word_stats")
async def reset_word_stats(word_service: WordService = Depends(get_word_service)):
    """Обнуляет счётчик показов для всех слов."""
    await word_service.reset_all_stats()
    return {"status": "success", "message": "Статистика слов сброшена"}

@router.post("/mark_triplet_learned")
async def mark_triplet_learned(
    request: Request,
    word_service: WordService = Depends(get_word_service),
):
    """Помечает всю тройку слов как выученную (JSON body)."""
    try:
        data = await request.json()
        eng = data.get("eng")
        is_learned = data.get("is_learned", True)

        if not eng:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Missing eng"})

        logger.info(f"mark_triplet_learned: eng={eng}, is_learned={is_learned}")
        word = await word_service.toggle_triplet_learned(eng, is_learned)
        if word:
            return {"status": "success", "is_learned": word.is_learned}
        return JSONResponse(status_code=404, content={"status": "error", "message": "Word not found"})
    except Exception as e:
        logger.error(f"Error in mark_triplet_learned: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@router.get("/word_lookup")
async def word_lookup(q: str, word_service: WordService = Depends(get_word_service)):
    results = await word_service.search_words(q, limit=10)
    out = []
    for w in results:
        out.append({
            "eng": w.eng,
            "it": w.it,
            "de": w.de,
            "ru": w.ru,
            "meaning": w.meaning,
            "count": w.count,
            "is_known_en": w.is_known_en,
            "is_known_it": w.is_known_it,
            "is_known_de": w.is_known_de,
            "is_learned": w.is_learned,
            "last_shown": w.last_shown.isoformat() if w.last_shown else None,
        })
    return {"results": out}

@router.post("/upsert_word")
async def upsert_word(
    eng: str = Form(...),
    it: str = Form(""),
    de: str = Form(""),
    ru: str = Form(""),
    meaning: str = Form(""),
    word_service: WordService = Depends(get_word_service),
):
    w = await word_service.upsert_word(eng, it, de, ru, meaning)
    return {
        "status": "success",
        "word": {
            "eng": w.eng,
            "it": w.it,
            "de": w.de,
            "ru": w.ru,
            "meaning": w.meaning,
            "count": w.count,
            "is_known_en": w.is_known_en,
            "is_known_it": w.is_known_it,
            "is_known_de": w.is_known_de,
            "is_learned": w.is_learned,
            "last_shown": w.last_shown.isoformat() if w.last_shown else None,
        }
    }

@router.delete("/delete_word")
async def delete_word(
    eng: str,
    word_service: WordService = Depends(get_word_service),
    user=Depends(check_auth_dependency),
):
    """Удаляет слово из базы данных."""
    success = await word_service.delete_word(eng)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete word")
