from fastapi import APIRouter, Request, Depends, Form, status, HTTPException
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

async def _process_form_submission(data: schemas.UniversalFormSchema, dashboard_service: DashboardService) -> Union[int, str, None]:
    """Обработка через DashboardService (Facade)."""
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
    data: schemas.UniversalFormSchema = Depends(schemas.UniversalFormSchema.as_form),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
) -> RedirectResponse:
    """Обработка стандартной HTML-формы."""
    await _process_form_submission(data, dashboard_service)
    return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/submit_form_json", response_model=schemas.SuccessResponse)
async def submit_form_json(
    data: schemas.UniversalFormSchema,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user: Any = Depends(check_auth_dependency),
):
    """Обработка JSON-запроса с автоматической валидацией Pydantic."""
    created_id = await _process_form_submission(data, dashboard_service)
    if created_id:
        return schemas.SuccessResponse(message=f"Данные успешно сохранены. ID: {created_id}")
    raise HTTPException(status_code=500, detail="Ошибка при сохранении")


@router.post("/submit_chrono")
async def submit_chrono(
    data: schemas.ChronoCreate = Depends(schemas.ChronoCreate.as_form),
    chronology_service: ChronologyService = Depends(get_chronology_service),
    user: Any = Depends(check_auth_dependency),
) -> RedirectResponse:
    await chronology_service.add_chronology(data.text, data.date)
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/submit_chrono_json", response_model=schemas.SuccessResponse)
async def submit_chrono_json(
    data: schemas.ChronoCreate = Depends(schemas.ChronoCreate.as_form),
    chronology_service: ChronologyService = Depends(get_chronology_service),
    user: Any = Depends(check_auth_dependency),
):
    created_id = await chronology_service.add_chronology(data.text, data.date)
    if created_id:
        return schemas.SuccessResponse(message="Хронология успешно сохранена")
    raise HTTPException(status_code=500, detail="Ошибка при сохранении")


@router.post("/edit_chrono_json", response_model=schemas.SuccessResponse)
async def edit_chrono_json(
    data: schemas.ChronoView,
    chronology_service: ChronologyService = Depends(get_chronology_service),
    user: Any = Depends(check_auth_dependency),
):
    success = await chronology_service.update_chronology(data.id, data.text, data.date)
    if success:
        return schemas.SuccessResponse(message="Chronology updated")
    raise HTTPException(status_code=404, detail="Запись не найдена")


@router.post("/mark_done/{task_id}", response_model=schemas.ToggleDoneResponse)
async def mark_task_done(
    request: Request,
    task_id: int,
    task_service: TaskService = Depends(get_task_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    await task_service.mark_task_done(task_id)
    if is_ajax_request(request):
        return schemas.ToggleDoneResponse(done=True, message="Task marked as done")
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/mark_event_done/{event_id}", response_model=schemas.ToggleDoneResponse)
async def mark_event_done(
    request: Request,
    event_id: int,
    date: Optional[str] = Form(None),
    recurrence_id: Optional[str] = Form(None),
    event_service: EventService = Depends(get_event_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    await event_service.mark_event_done(event_id, event_date=date, recurrence_id=recurrence_id)
    if is_ajax_request(request):
        return schemas.ToggleDoneResponse(done=True, message="Event marked as done")
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/toggle_event_done/{event_id}", response_model=schemas.ToggleDoneResponse)
async def toggle_event_done(
    event_id: int,
    event_service: EventService = Depends(get_event_service),
    user: Any = Depends(check_auth_dependency),
):
    new_status = await event_service.toggle_event_done(event_id)
    if new_status is not None:
        return schemas.ToggleDoneResponse(done=new_status)
    raise HTTPException(status_code=404, detail="Event not found")


@router.post("/mark_as_done/{habit_id}", response_model=schemas.ToggleDoneResponse)
async def mark_habit_done(
    request: Request,
    habit_id: int,
    habit_service: HabitService = Depends(get_habit_service),
    user: Any = Depends(check_auth_dependency),
) -> Any:
    await habit_service.mark_habit_done(habit_id)
    if is_ajax_request(request):
        return schemas.ToggleDoneResponse(done=True, message="Habit marked as done")
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/delete_event/{event_id}", response_model=schemas.SuccessResponse)
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
        return schemas.SuccessResponse(message="Event deleted")
    return RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)

