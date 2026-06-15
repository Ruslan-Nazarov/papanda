from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional, Any, Dict
from ..database import get_db
from ..dependencies import get_sticky_note_service
from ..services.sticky_note_service import StickyNoteService
from ..services.auth import check_auth_dependency
from pydantic import BaseModel
from ..schemas import StickyNoteView, NoteView

router = APIRouter(
    prefix="/api/stickers",
    tags=["stickers"]
)

class StickerCreate(BaseModel):
    """Схема для создания стикера."""
    text: str
    title: Optional[str] = None
    color: str = "#fff9c4"
    type: str = "text"
    event_id: Optional[int] = None
    recurrence_id: Optional[str] = None
    task_id: Optional[int] = None
    habit_id: Optional[int] = None
    note_id: Optional[int] = None
    dialectics_id: Optional[int] = None
    dialectics_block_id: Optional[str] = None

class StickerUpdate(BaseModel):
    """Схема для обновления стикера."""
    text: Optional[str] = None
    title: Optional[str] = None
    color: Optional[str] = None
    type: Optional[str] = None
    note_id: Optional[int] = None
    dialectics_id: Optional[int] = None
    dialectics_block_id: Optional[str] = None

@router.get("/debug_info")
async def debug_info(db_session: Any = Depends(get_db)):
    from sqlalchemy import select
    from ..models import Event, StickyNote
    
    events_res = await db_session.execute(select(Event))
    events = events_res.scalars().all()
    events_data = [{
        "id": e.id, "title": e.title, "date": str(e.date), 
        "recurrence_id": e.recurrence_id, "done": e.done
    } for e in events]
    
    stickers_res = await db_session.execute(select(StickyNote))
    stickers = stickers_res.scalars().all()
    stickers_data = [{
        "id": s.id, "title": s.title, "text": s.text, 
        "event_id": s.event_id, "recurrence_id": s.recurrence_id, 
        "finished_at": str(s.finished_at) if s.finished_at else None
    } for s in stickers]
    
    return {"events": events_data, "stickers": stickers_data}

@router.get("/notes_search", response_model=List[NoteView])

async def search_notes_for_stickers(
    query: Optional[str] = None,
    db_session: Any = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список заметок для прикрепления к стикеру."""
    from ..services.note_service import NoteService
    from ..logger import logger
    try:
        ns = NoteService(db_session)
        if query:
            notes = await ns.search_notes(query)
        else:
            notes = await ns.get_recent_notes()
        return notes
    except Exception as e:
        logger.error(f"Error searching notes for stickers: {e}", exc_info=True)
        return []

@router.get("/", response_model=List[StickyNoteView])
async def get_stickers(
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список всех активных стикеров."""
    notes = await service.get_active_notes()
    return notes

@router.get("/event/{event_id}/", response_model=List[StickyNoteView])
async def get_event_stickers(
    event_id: int, 
    recurrence_id: Optional[str] = None, 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает стикеры, привязанные к конкретному событию или серии событий."""
    return await service.get_notes_for_event(event_id=event_id, recurrence_id=recurrence_id)

@router.get("/task/{task_id}/", response_model=List[StickyNoteView])
async def get_task_stickers(
    task_id: int, 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает стикеры, привязанные к задаче."""
    return await service.get_notes_for_task(task_id=task_id)

@router.get("/habit/{habit_id}/", response_model=List[StickyNoteView])
async def get_habit_stickers(
    habit_id: int, 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает стикеры, привязанные к привычке."""
    return await service.get_notes_for_habit(habit_id=habit_id)

@router.get("/note/{note_id}/", response_model=List[StickyNoteView])
async def get_regular_note_stickers(
    note_id: int, 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает стикеры, привязанные к обычной заметке."""
    return await service.get_notes_for_note(note_id=note_id)

@router.get("/dialectics/{dialectics_id}/", response_model=List[StickyNoteView])
async def get_dialectics_stickers(
    dialectics_id: int, 
    recurrence_id: Optional[str] = None,
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает стикеры, привязанные к модулю Диалектики."""
    return await service.get_notes_for_dialectics(dialectics_id=dialectics_id, block_id=recurrence_id)

@router.post("/", response_model=StickyNoteView)
async def create_sticker(
    data: StickerCreate, 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Создает новый стикер."""
    return await service.create_note(
        text=data.text, 
        title=data.title, 
        color=data.color, 
        note_type=data.type,
        event_id=data.event_id,
        recurrence_id=data.recurrence_id,
        task_id=data.task_id,
        habit_id=data.habit_id,
        note_id=data.note_id,
        dialectics_id=data.dialectics_id,
        dialectics_block_id=data.dialectics_block_id
    )

@router.get("/{note_id}/", response_model=StickyNoteView)
async def get_sticker(
    note_id: int, 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает данные конкретного стикера."""
    note = await service.get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Sticker not found")
    return note

@router.patch("/{note_id}/", response_model=StickyNoteView)
async def update_sticker(
    note_id: int, 
    data: StickerUpdate, 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Обновляет содержимое или свойства стикера."""
    note = await service.update_note(
        note_id=note_id, 
        text=data.text, 
        title=data.title, 
        color=data.color, 
        note_type=data.type,
        note_id_link=data.note_id,
        dialectics_id=data.dialectics_id,
        dialectics_block_id=data.dialectics_block_id
    )
    if not note:
        raise HTTPException(status_code=404, detail="Sticker not found")
    return note

@router.delete("/{note_id}/")
async def delete_sticker(
    note_id: int, 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, str]:
    """Полное удаление стикера из базы данных."""
    success = await service.hard_delete_note(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sticker not found")
    return {"status": "success"}

@router.post("/{note_id}/archive/")
async def archive_sticker(
    note_id: int, 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, str]:
    """Архивация стикера (мягкое удаление)."""
    success = await service.archive_note(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sticker not found")
    return {"status": "success"}

@router.post("/reorder/")
async def reorder_stickers(
    note_ids: List[int] = Body(...), 
    service: StickyNoteService = Depends(get_sticky_note_service), 
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, str]:
    """Изменяет порядок отображения стикеров."""
    await service.reorder_notes(note_ids)
    return {"status": "success"}

