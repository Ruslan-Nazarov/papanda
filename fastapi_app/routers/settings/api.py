from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import List, Dict, Any

from ...database import get_db
from ... import models
from ...services.auth import check_auth_dependency
from ...services.event_service import EventService
from ...services.admin_service import AdminService
from ...dependencies import get_event_service, get_admin_service

router = APIRouter(
    dependencies=[Depends(check_auth_dependency)]
)

@router.post("/edit_event_inline", name="edit_event_inline")
async def edit_event_inline(
    request: Request, 
    event_service: EventService = Depends(get_event_service)
) -> JSONResponse:
    """Редактирует событие или создает новое."""
    data = await request.json()
    success, message, created_id = await event_service.update_event_inline(data)
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": message, "id": created_id})
    return JSONResponse(status_code=400, content={"status": "error", "message": message})

@router.post("/edit_note_inline", name="edit_note_inline")
async def edit_note_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    data = await request.json()
    success = await as_service.update_item("Notes", data.get("id"), data)
    return JSONResponse(status_code=200 if success else 400, content={"status": "success" if success else "error"})

@router.post("/edit_chrono_inline", name="edit_chrono_inline")
async def edit_chrono_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    data = await request.json()
    success = await as_service.update_item("Chronology", data.get("id"), data)
    return JSONResponse(status_code=200 if success else 400, content={"status": "success" if success else "error"})

@router.post("/edit_habit_inline", name="edit_habit_inline")
async def edit_habit_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    data = await request.json()
    success = await as_service.update_item("Habit", data.get("id"), data)
    return JSONResponse(status_code=200 if success else 400, content={"status": "success" if success else "error"})

@router.post("/edit_task_inline", name="edit_task_inline")
async def edit_task_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    data = await request.json()
    success = await as_service.update_item("Task", data.get("id"), data)
    return JSONResponse(status_code=200 if success else 400, content={"status": "success" if success else "error"})

@router.post("/edit_wink_inline", name="edit_wink_inline")
async def edit_wink_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    data = await request.json()
    success = await as_service.update_item("Wink", data.get("id"), data)
    return JSONResponse(status_code=200 if success else 400, content={"status": "success" if success else "error"})

@router.post("/edit_sticker_inline", name="edit_sticker_inline")
async def edit_sticker_inline(
    request: Request, 
    as_service: AdminService = Depends(get_admin_service)
) -> JSONResponse:
    data = await request.json()
    success = await as_service.update_item("StickyNote", data.get("id"), data)
    return JSONResponse(status_code=200 if success else 400, content={"status": "success" if success else "error"})

@router.get("/api/events/tree/{color}", name="get_event_tree")
async def get_event_tree(color: str, db: AsyncSession = Depends(get_db)) -> JSONResponse:
    """Возвращает дерево событий определенного цвета."""
    if not color.startswith("#") and len(color) in (6, 3, 8):
        color = "#" + color

    result = await db.execute(select(models.Event).where(models.Event.color == color).order_by(models.Event.date.asc()))
    events = result.scalars().all()
    
    tree_data = []
    for e in events:
        stickers_res = await db.execute(
            select(func.count(models.StickyNote.id))
            .where(
                models.StickyNote.finished_at.is_(None),
                or_(models.StickyNote.event_id == e.id, and_(models.StickyNote.recurrence_id.isnot(None), models.StickyNote.recurrence_id == e.recurrence_id))
            )
        )
        tree_data.append({
            "id": e.id, "title": e.title, "date": e.date.isoformat(),
            "has_stickers": (stickers_res.scalar() or 0) > 0,
            "recurrence_id": e.recurrence_id
        })
    return JSONResponse(content={"status": "success", "data": tree_data})
