from fastapi import APIRouter, Depends, Body
from typing import List, Dict, Any

from ..services.event_service import EventService
from ..services.task_service import TaskService
from ..dependencies import get_event_service, get_task_service
from ..services.auth import check_auth_dependency
from ..logger import logger

router = APIRouter(
    prefix="/api/dnd",
    tags=["dnd"],
    dependencies=[Depends(check_auth_dependency)]
)

@router.post("/reorder_tasks")
async def reorder_tasks(
    task_ids: List[int] = Body(...),
    task_service: TaskService = Depends(get_task_service)
) -> Dict[str, str]:
    """Изменяет порядок задач в списке."""
    success = await task_service.reorder_tasks(task_ids)
    return {"status": "success" if success else "error"}

@router.post("/reorder_events")
async def reorder_events(
    event_ids: List[int] = Body(...),
    event_service: EventService = Depends(get_event_service)
) -> Dict[str, str]:
    """Изменяет порядок событий в списке."""
    success = await event_service.reorder_events(event_ids)
    return {"status": "success" if success else "error"}

@router.post("/move_event")
async def move_event(
    event_id: int = Body(...),
    new_date: str = Body(...),
    event_service: EventService = Depends(get_event_service)
) -> Dict[str, str]:
    """
    Переносит событие на другую дату (поддерживает 'today', 'tomorrow' или ISO дату).
    """
    success = await event_service.update_event_date(event_id, new_date)
    return {"status": "success" if success else "error"}
