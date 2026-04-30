from fastapi import APIRouter, Request, Depends, Form, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date
import json
from typing import Optional, List, Dict, Any, Union, Tuple

from ..database import get_db
from ..services.auth import check_auth_dependency, get_current_user_from_cookie
from ..services.dashboard_service import DashboardService
from ..dependencies import get_dashboard_service
from ..logger import logger
from ..utils import parse_date_input
from .. import schemas
from pydantic import ValidationError

router = APIRouter(
    tags=["actions"]
)

async def _extract_form_data(request: Request) -> schemas.UniversalFormSchema:
    """Извлекает данные формы в структурированную Pydantic схему."""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)
        # Обработка чекбокса
        if "sticker_apply_series" in data:
            data["sticker_apply_series"] = str(data["sticker_apply_series"]).lower() in ["true", "on", "1"]
    
    return schemas.UniversalFormSchema(**data)


async def _process_form_submission(request: Request, dashboard_service: DashboardService) -> Union[int, str, None]:
    """Вспомогательный метод для обработки общих данных формы."""
    data = await _extract_form_data(request)
    
    dt = parse_date_input(data.common_date)
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())

    sticker_data = {
        "text": data.sticker_text,
        "title": data.sticker_title,
        "color": data.sticker_color,
        "type": data.sticker_type,
        "apply_series": data.sticker_apply_series
    }

    return await dashboard_service.submit_form(
        data.common_category, data.common_text, dt, 
        data.repeat, data.repeat_end, 
        sticker_data=sticker_data, color=data.common_color
    )


@router.post("/submit_form")
async def submit_form(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> RedirectResponse:
    try:
        await _process_form_submission(request, dashboard_service)
    except ValidationError:
        logger.info("Validation failed in submit_form")
    return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/submit_form_json")
async def submit_form_json(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> JSONResponse:
    """JSON версия submit_form."""
    try:
        created_id = await _process_form_submission(request, dashboard_service)
        if created_id:
            return JSONResponse(status_code=200, content={"status": "success", "id": created_id, "message": "Данные успешно сохранены"})
        return JSONResponse(status_code=500, content={"status": "error", "message": "Ошибка при сохранении"})
    except ValidationError as e:
        logger.info(f"Validation failed in submit_form_json: {e}")
        return JSONResponse(status_code=400, content={"status": "error", "message": "Ошибка валидации данных"})

async def _process_chrono_submission(text: str, date_str: str, dashboard_service: DashboardService) -> Optional[int]:
    """Вспомогательный метод для обработки данных хронологии."""
    dt = parse_date_input(date_str)
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())
    return await dashboard_service.add_chronology(text, dt)


@router.post("/submit_chrono")
async def submit_chrono(
    chrono_text: str = Form(..., min_length=1, max_length=10000),
    chrono_date: str = Form(..., min_length=10, max_length=10),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> RedirectResponse:
    """Добавляет запись в хронологию."""
    await _process_chrono_submission(chrono_text, chrono_date, dashboard_service)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/submit_chrono_json")
async def submit_chrono_json(
    chrono_text: str = Form(..., min_length=1, max_length=10000),
    chrono_date: str = Form(..., min_length=10, max_length=10),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> JSONResponse:
    """JSON версия submit_chrono."""
    created_id = await _process_chrono_submission(chrono_text, chrono_date, dashboard_service)
    if created_id:
        return JSONResponse(status_code=200, content={"status": "success", "id": created_id, "message": "Хронология успешно сохранена"})
    return JSONResponse(status_code=500, content={"status": "error", "message": "Ошибка при сохранении"})

@router.post("/edit_chrono_json")
async def edit_chrono_json(
    request: Request,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    """
    JSON версия обновления хронологии.
    """
    data = await request.json()
    chrono_id = data.get("id")
    text = data.get("text")
    date_str = data.get("date")

    if not chrono_id or not text or not date_str:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "Необходимы ID, текст и дата"}
        )

    dt = parse_date_input(str(date_str))
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())

    success = await dashboard_service.update_chronology(int(chrono_id), str(text), dt)

    if success:
        return {"status": "success"}
    else:
        return JSONResponse(status_code=404, content={"status": "error", "message": "Запись не найдена"})

@router.post("/mark_done/{task_id}")
async def mark_task_done(
    task_id: int,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> RedirectResponse:
    """Помечает задачу как выполненную."""
    await dashboard_service.mark_task_done(task_id)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/mark_event_done/{event_id}")
async def mark_event_done(
    request: Request,
    event_id: int,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    """Помечает событие как выполненное."""
    await dashboard_service.mark_event_done(event_id)
    
    accept_header = request.headers.get("accept", "").lower()
    if "application/json" in accept_header or request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return JSONResponse(content={"status": "success", "message": "Event marked as done"})
        
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/toggle_event_done/{event_id}")
async def toggle_event_done(
    request: Request,
    event_id: int,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> JSONResponse:
    """Переключает статус выполнения события."""
    new_status = await dashboard_service.toggle_event_done(event_id)
    if new_status is not None:
        return JSONResponse(content={"status": "success", "done": new_status})
    return JSONResponse(status_code=404, content={"status": "error", "message": "Event not found"})


@router.post("/mark_as_done/{habit_id}")
async def mark_habit_done(
    habit_id: int,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> RedirectResponse:
    """Помечает привычку как выполненную сегодня."""
    await dashboard_service.mark_habit_done(habit_id)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/delete_event/{event_id}")
async def delete_event(
    request: Request,
    event_id: int,
    delete_future: bool = Form(False),
    delete_mode: Optional[str] = Form(None),
    event_date: Optional[str] = Form(None),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    """Удаляет событие (или серию событий)."""
    await dashboard_service.delete_event(event_id, delete_mode, event_date)
        
    accept_header = request.headers.get("accept", "").lower()
    is_ajax = (
        "application/json" in accept_header or
        request.headers.get("X-Requested-With") == "XMLHttpRequest" or
        delete_mode is not None
    )
    
    if is_ajax:
        return JSONResponse(content={"status": "success", "message": "Event deleted"})
    
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)

