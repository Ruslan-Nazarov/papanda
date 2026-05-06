from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import List, Dict, Any

from ...database import get_db
from ... import models, schemas
from ...services.auth import check_auth_dependency
from ...services.event_service import EventService
from ...services.admin_service import AdminService
from ...dependencies import get_event_service, get_admin_service
from ...logger import logger

router = APIRouter(
    dependencies=[Depends(check_auth_dependency)]
)

@router.post("/edit_event_inline", response_model=schemas.SuccessResponse)
async def edit_event_inline(
    request: Request, 
    event_service: EventService = Depends(get_event_service)
):
    """Редактирует событие или создает новое."""
    data = await request.json()
    success, message, created_id = await event_service.update_event_inline(data)
    if success:
        return schemas.SuccessResponse(message=f"{message}. ID: {created_id}")
    return JSONResponse(status_code=400, content={"status": "error", "message": message})

@router.post("/edit_note_inline", response_model=schemas.SuccessResponse)
async def edit_note_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Notes", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_chrono_inline", response_model=schemas.SuccessResponse)
async def edit_chrono_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Chronology", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_habit_inline", response_model=schemas.SuccessResponse)
async def edit_habit_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Habit", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_task_inline", response_model=schemas.SuccessResponse)
async def edit_task_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Task", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_wink_inline", response_model=schemas.SuccessResponse)
async def edit_wink_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Wink", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_sticker_inline", response_model=schemas.SuccessResponse)
async def edit_sticker_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("StickyNote", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.get("/api/events/tree/{color}", response_model=schemas.SuccessResponse)
async def get_event_tree(color: str, db: AsyncSession = Depends(get_db)):
    """Возвращает дерево событий определенного цвета."""
    # Ensure we search both formats: #RRGGBB and RRGGBB
    search_color = color if color.startswith("#") else "#" + color
    raw_color = search_color.replace("#", "")
    
    result = await db.execute(
        select(models.Event)
        .where(
            or_(
                func.lower(models.Event.color) == search_color.lower(),
                func.lower(models.Event.color) == raw_color.lower()
            )
        )
        .order_by(models.Event.date.asc())
    )
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
            "recurrence_id": e.recurrence_id,
            "important": e.important,
            "color": e.color,
            "done": e.done
        })
    return schemas.SuccessResponse(message="Success", data=tree_data)
