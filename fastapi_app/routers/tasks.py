from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..services.task_service import TaskService

router = APIRouter(
    prefix="/api/tasks",
    tags=["tasks"]
)

@router.get("/sets")
async def get_task_sets(
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, Any]:
    """Возвращает список наборов задач и активный набор."""
    service = TaskService(db)
    sets = await service.get_all_sets()
    active_set = await service.ensure_active_set()
    return {
        "sets": [{"id": s.id, "name": s.name, "is_active": s.is_active} for s in sets],
        "active_id": active_set.id if active_set else None
    }

@router.post("/sets")
async def create_task_set(
    data: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, Any]:
    """Создает новый набор задач."""
    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    clone = bool(data.get("clone", False))
    service = TaskService(db)
    new_set = await service.create_set(name, clone_from_active=clone)
    return {"status": "success", "id": new_set.id, "name": new_set.name}

@router.post("/sets/{set_id}/activate")
async def activate_task_set(
    set_id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, Any]:
    """Активирует набор задач."""
    service = TaskService(db)
    target = await service.activate_set(set_id)
    if not target:
        raise HTTPException(status_code=404, detail="Set not found")
    return {"status": "success"}
