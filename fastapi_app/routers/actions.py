from fastapi import APIRouter, Request, Depends, Form, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date
import json

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..services.dashboard_service import DashboardService
from ..dependencies import get_dashboard_service
from ..logger import logger

router = APIRouter(
    tags=["actions"]
)


from ..utils import parse_date_input

async def _extract_form_data(request: Request):
    """Вспомогательная функция для сбора данных из Form, JSON или QueryString."""
    text = date_val = cat = None
    repeat = "none"
    repeat_end = ""

    # 1. Пробуем FormData
    try:
        form = await request.form()
        text = form.get("common_text")
        date_val = form.get("common_date")
        cat = form.get("common_category")
        repeat = form.get("repeat", "none")
        repeat_end = form.get("repeat_end", "")
    except Exception:
        pass

    # 2. Если пусто, пробуем JSON
    if not text or not cat:
        try:
            payload = await request.json()
            text = text or payload.get("common_text")
            date_val = date_val or payload.get("common_date")
            cat = cat or payload.get("common_category")
            repeat = payload.get("repeat", repeat)
            repeat_end = repeat_end or payload.get("repeat_end", "")
        except Exception:
            pass
            
    return text, date_val, cat, repeat, repeat_end


@router.post("/submit_form")
async def submit_form(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(check_auth_dependency),
):
    """Универсальная форма добавления: события, задачи, привычки, досуг, dashboard-элементы."""
    common_text, common_date, common_category, repeat, repeat_end = await _extract_form_data(request)

    if not common_text or not common_category or not common_date:
        logger.info("Missing required fields in submit_form")
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

    # Используем общую утилиту для дат
    dt = parse_date_input(common_date)
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())

    await dashboard_service.submit_form(common_category, common_text, dt, repeat, repeat_end)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/submit_form_json")
async def submit_form_json(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(check_auth_dependency),
):
    """
    JSON версия submit_form с гарантией сохранения (через перечитывание из БД).
    ✅ Возвращает {status: 'success', id: ID} или {status: 'error', message: '...'}
    """
    common_text, common_date, common_category, repeat, repeat_end = await _extract_form_data(request)

    if not common_text or not common_category or not common_date:
        logger.info("Missing required fields in submit_form_json")
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "Заполните все поля: текст, дата, категория"}
        )

    try:
        dt = parse_date_input(common_date)
        if isinstance(dt, date) and not isinstance(dt, datetime):
            dt = datetime.combine(dt, datetime.min.time())
            
        # ✅ Сохраняем и получаем ID (с проверкой через перечитывание)
        created_id = await dashboard_service.submit_form(common_category, common_text, dt, repeat, repeat_end)

        if created_id:
            logger.info(f"Successfully saved {common_category}: id={created_id}")
            return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "id": created_id,
                    "message": "Данные успешно сохранены"
                }
            )
        else:
            logger.warning(f"Could not verify saved {common_category}")
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Ошибка при проверке сохранения"}
            )
    except Exception as e:
        logger.error(f"Error in submit_form_json: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Ошибка при сохранении данных"}
        )


@router.post("/submit_chrono")
async def submit_chrono(
    chrono_text: str = Form(..., min_length=1, max_length=10000),
    chrono_date: str = Form(..., min_length=10, max_length=10),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(check_auth_dependency),
):
    dt = parse_date_input(chrono_date)
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())
        
    await dashboard_service.add_chronology(chrono_text, dt)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/submit_chrono_json")
async def submit_chrono_json(
    chrono_text: str = Form(..., min_length=1, max_length=10000),
    chrono_date: str = Form(..., min_length=10, max_length=10),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(check_auth_dependency),
):
    """
    JSON версия submit_chrono с гарантией сохранения.
    ✅ Возвращает {status: 'success', id: ID} или {status: 'error', message: '...'}
    """
    try:
        dt = parse_date_input(chrono_date)
        if isinstance(dt, date) and not isinstance(dt, datetime):
            dt = datetime.combine(dt, datetime.min.time())

        # ✅ Сохраняем и получаем ID (с проверкой через перечитывание)
        created_id = await dashboard_service.add_chronology(chrono_text, dt)

        if created_id:
            logger.info(f"Successfully saved chronology: id={created_id}")
            return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "id": created_id,
                    "message": "Хронология успешно сохранена"
                }
            )
        else:
            logger.warning("Could not verify saved chronology")
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Ошибка при проверке сохранения"}
            )
    except Exception as e:
        logger.error(f"Error in submit_chrono_json: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Ошибка при сохранении хронологии"}
        )


@router.post("/edit_chrono_json")
async def edit_chrono_json(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(check_auth_dependency),
):
    """
    JSON версия обновления хронологии.
    """
    try:
        data = await request.json()
        chrono_id = data.get("id")
        text = data.get("text")
        date_str = data.get("date")

        if not chrono_id or not text or not date_str:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Необходимы ID, текст и дата"}
            )

        dt = parse_date_input(date_str)
        if isinstance(dt, date) and not isinstance(dt, datetime):
            dt = datetime.combine(dt, datetime.min.time())

        success = await dashboard_service.update_chronology(int(chrono_id), text, dt)

        if success:
            return {"status": "success"}
        else:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Запись не найдена"})
    except Exception as e:
        logger.error(f"Error in edit_chrono_json: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Ошибка при обновлении хронологии"}
        )


@router.post("/mark_done/{task_id}")
async def mark_task_done(
    task_id: int,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(check_auth_dependency),
):
    await dashboard_service.mark_task_done(task_id)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/mark_event_done/{event_id}")
async def mark_event_done(
    event_id: int,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(check_auth_dependency),
):
    await dashboard_service.mark_event_done(event_id)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/mark_as_done/{habit_id}")
async def mark_habit_done(
    habit_id: int,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(check_auth_dependency),
):
    await dashboard_service.mark_habit_done(habit_id)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/delete_event/{event_id}")
async def delete_event(
    request: Request,
    event_id: int,
    delete_future: bool = Form(False),
    delete_mode: str | None = Form(None),  # 'only' | 'this_and_future' | 'future_only'
    db: AsyncSession = Depends(get_db),
    user=Depends(check_auth_dependency),
):
    from .. import models
    from sqlalchemy import delete, select
    
    # 1. Находим событие, которое хотим удалить
    event_res = await db.execute(select(models.Event).where(models.Event.id == event_id))
    event = event_res.scalar_one_or_none()
    
    if event:
        # Унифицированная логика удаления:
        # - delete_mode == 'all'             -> удалить все экземпляры серии
        # - delete_mode == 'this_and_future' -> удалить текущую и все будущие
        # - delete_mode == 'future_only'     -> оставить текущую, удалить только будущие
        # - иначе                            -> удалить только текущую
        mode = (delete_mode or "").strip().lower()

        # Если удаляемый объект был "шаблоном" (имел recurrence_rule),
        # и мы удаляем ТОЛЬКО его, нужно передать правило следующему экземпляру.
        if mode not in ("this_and_future", "future_only", "all") and event.recurrence_rule and event.recurrence_id:
            next_event_res = await db.execute(
                select(models.Event)
                .where(models.Event.recurrence_id == event.recurrence_id, models.Event.id != event.id)
                .order_by(models.Event.date.asc())
                .limit(1)
            )
            next_event = next_event_res.scalar_one_or_none()
            if next_event:
                next_event.recurrence_rule = event.recurrence_rule
                next_event.recurrence_end = event.recurrence_end

        if mode == "all" and event.recurrence_id:
            await db.execute(
                delete(models.Event).where(
                    models.Event.recurrence_id == event.recurrence_id
                )
            )
        elif mode == "this_and_future" and event.recurrence_id:
            await db.execute(
                delete(models.Event).where(
                    models.Event.recurrence_id == event.recurrence_id,
                    models.Event.date >= event.date
                )
            )
        elif mode == "future_only" and event.recurrence_id:
            await db.execute(
                delete(models.Event).where(
                    models.Event.recurrence_id == event.recurrence_id,
                    models.Event.date > event.date
                )
            )
        else:
            await db.execute(delete(models.Event).where(models.Event.id == event_id))
        
        await db.commit()
        
    # Возвращаем JSON если это AJAX-запрос
    if "application/json" in request.headers.get("accept", "") or "XMLHttpRequest" == request.headers.get("X-Requested-With"):
        return {"status": "success"}
    
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)

