from fastapi import APIRouter, Request, Depends, Form, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date
import json
from typing import Optional, List, Dict, Any, Union, Tuple

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..services.dashboard_service import DashboardService
from ..services.event_service import EventService
from ..services.task_service import TaskService
from ..services.habit_service import HabitService
from ..services.chronology_service import ChronologyService

from ..dependencies import (
    get_dashboard_service, get_event_service, 
    get_task_service, get_habit_service, get_chronology_service
)
from ..logger import logger
from ..utils import parse_date_input, is_ajax_request
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
        if "sticker_apply_series" in data:
            data["sticker_apply_series"] = str(data["sticker_apply_series"]).lower() in ["true", "on", "1"]
    
    return schemas.UniversalFormSchema(**data)


async def _process_form_submission(request: Request, dashboard_service: DashboardService) -> Union[int, str, None]:
    """Обработка через DashboardService (Facade)."""
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
    try:
        created_id = await _process_form_submission(request, dashboard_service)
        if created_id:
            return JSONResponse(status_code=200, content={"status": "success", "id": created_id, "message": "Данные успешно сохранены"})
        return JSONResponse(status_code=500, content={"status": "error", "message": "Ошибка при сохранении"})
    except ValidationError as e:
        logger.info(f"Validation failed in submit_form_json: {e}")
        return JSONResponse(status_code=400, content={"status": "error", "message": "Ошибка валидации данных"})


@router.post("/submit_chrono")
async def submit_chrono(
    chrono_text: str = Form(..., min_length=1, max_length=10000),
    chrono_date: str = Form(..., min_length=10, max_length=10),
    chronology_service: ChronologyService = Depends(get_chronology_service),
    user: Any = Depends(check_auth_dependency),
) -> RedirectResponse:
    dt = parse_date_input(chrono_date)
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())
    await chronology_service.add_chronology(chrono_text, dt)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/submit_chrono_json")
async def submit_chrono_json(
    chrono_text: str = Form(..., min_length=1, max_length=10000),
    chrono_date: str = Form(..., min_length=10, max_length=10),
    chronology_service: ChronologyService = Depends(get_chronology_service),
    user: Any = Depends(check_auth_dependency),
) -> JSONResponse:
    dt = parse_date_input(chrono_date)
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())
    created_id = await chronology_service.add_chronology(chrono_text, dt)
    if created_id:
        return JSONResponse(status_code=200, content={"status": "success", "id": created_id, "message": "Хронология успешно сохранена"})
    return JSONResponse(status_code=500, content={"status": "error", "message": "Ошибка при сохранении"})


@router.post("/edit_chrono_json")
async def edit_chrono_json(
    request: Request,
    chronology_service: ChronologyService = Depends(get_chronology_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    data = await request.json()
    chrono_id = data.get("id")
    text = data.get("text")
    date_str = data.get("date")

    if not chrono_id or not text or not date_str:
        return JSONResponse(status_code=400, content={"status": "error", "message": "Необходимы ID, текст и дата"})

    dt = parse_date_input(str(date_str))
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())

    success = await chronology_service.update_chronology(int(chrono_id), str(text), dt)
    return {"status": "success"} if success else JSONResponse(status_code=404, content={"status": "error", "message": "Запись не найдена"})


@router.post("/mark_done/{task_id}")
async def mark_task_done(
    request: Request,
    task_id: int,
    task_service: TaskService = Depends(get_task_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    await task_service.mark_task_done(task_id)
    if is_ajax_request(request):
        return JSONResponse(content={"status": "success", "done": True, "message": "Task marked as done"})
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/mark_event_done/{event_id}")
async def mark_event_done(
    request: Request,
    event_id: int,
    date: Optional[str] = Form(None),
    event_service: EventService = Depends(get_event_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    await event_service.mark_event_done(event_id, event_date=date)
    if is_ajax_request(request):
        return JSONResponse(content={"status": "success", "done": True, "message": "Event marked as done"})
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/toggle_event_done/{event_id}")
async def toggle_event_done(
    request: Request,
    event_id: int,
    event_service: EventService = Depends(get_event_service),
    user: Any = Depends(check_auth_dependency),
) -> JSONResponse:
    new_status = await event_service.toggle_event_done(event_id)
    if new_status is not None:
        return JSONResponse(content={"status": "success", "done": new_status})
    return JSONResponse(status_code=404, content={"status": "error", "message": "Event not found"})


@router.post("/mark_as_done/{habit_id}")
async def mark_habit_done(
    request: Request,
    habit_id: int,
    habit_service: HabitService = Depends(get_habit_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    await habit_service.mark_habit_done(habit_id)
    if is_ajax_request(request):
        return JSONResponse(content={"status": "success", "done": True, "message": "Habit marked as done"})
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/delete_event/{event_id}")
async def delete_event(
    request: Request,
    event_id: int,
    delete_mode: Optional[str] = Form(None),
    event_date: Optional[str] = Form(None),
    event_service: EventService = Depends(get_event_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    await event_service.delete_event(event_id, delete_mode, event_date)
    if is_ajax_request(request) or delete_mode is not None:
        return JSONResponse(content={"status": "success", "message": "Event deleted"})
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)

