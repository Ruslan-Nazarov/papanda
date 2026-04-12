from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database import get_db
from ..services.dashboard_service import DashboardService
from ..dependencies import get_dashboard_service
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
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    success = await dashboard_service.reorder_tasks(task_ids)
    return {"status": "success" if success else "error"}

@router.post("/reorder_events")
async def reorder_events(
    event_ids: List[int] = Body(...),
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    success = await dashboard_service.reorder_events(event_ids)
    return {"status": "success" if success else "error"}

@router.post("/move_event")
async def move_event(
    event_id: int = Body(...),
    new_date: str = Body(...),
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    """new_date can be 'today' or 'tomorrow'"""
    success = await dashboard_service.update_event_date(event_id, new_date)
    return {"status": "success" if success else "error"}
