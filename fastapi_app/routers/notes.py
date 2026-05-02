from fastapi import APIRouter, Depends, Form, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, Any, Dict, Union, List

from ..services.auth import check_auth_dependency
from ..services.note_service import NoteService
from ..dependencies import get_note_service
from .. import models, schemas
from ..logger import logger

router = APIRouter(
    tags=["notes"]
)

@router.post("/add_note", response_model=schemas.SuccessResponse)
async def add_note(
    category: Optional[str] = Form(default=None, min_length=1, max_length=50),
    note: str = Form(..., min_length=1, max_length=10000),
    sticker_text: Optional[str] = Form(None),
    sticker_title: Optional[str] = Form(None),
    sticker_color: Optional[str] = Form(None),
    sticker_type: Optional[str] = Form(None),
    is_pinned: bool = Form(False),
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    """
    Добавляет заметку через Form (для совместимости с фронтендом).
    """
    if not category:
        result = await note_service.db.execute(select(models.NoteCategory).limit(1))
        first_cat = result.scalar_one_or_none()
        category = first_cat.name if first_cat else "default"

    sticker_data = None
    if sticker_text or sticker_title:
        sticker_data = {
            "text": sticker_text,
            "title": sticker_title,
            "color": sticker_color or "#fff9c4",
            "type": sticker_type or "text"
        }

    note_id = await note_service.add_note(category, note, sticker_data=sticker_data, is_pinned=is_pinned)
    return schemas.SuccessResponse(message=f"Заметка успешно сохранена. ID: {note_id}")


@router.post("/api/notes/{note_id}/pin", response_model=schemas.SuccessResponse)
async def pin_note(
    note_id: int,
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    note = await note_service.db.get(models.Notes, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.is_pinned = True
    await note_service.db.commit()
    return schemas.SuccessResponse(message="Note pinned")


@router.get("/api/notes/pinned", response_model=List[schemas.NoteView])
async def get_pinned_notes(
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    res = await note_service.db.execute(
        select(models.Notes)
        .options(selectinload(models.Notes.stickers))
        .where(models.Notes.is_pinned == True)
        .order_by(models.Notes.created_at.desc())
    )
    pinned = res.scalars().all()
    
    # Расширяем данные для схемы
    for n in pinned:
        n.preview = (n.note[:100] + '...') if len(n.note) > 100 else n.note
        n.title = f"[{n.category}]" if n.category else f"Note #{n.id}"
        
    return pinned


@router.post("/api/notes/{note_id}/unpin", response_model=schemas.SuccessResponse)
async def unpin_note(
    note_id: int,
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    note = await note_service.db.get(models.Notes, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.is_pinned = False
    await note_service.db.commit()
    return schemas.SuccessResponse(message="Note unpinned")


@router.get("/api/notes/{note_id}", response_model=schemas.NoteView)
async def get_note(
    note_id: int,
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    note = await note_service.db.get(models.Notes, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.post("/api/notes/{note_id}/update", response_model=schemas.SuccessResponse)
async def update_note(
    note_id: int,
    data: schemas.NoteUpdate,
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    success = await note_service.update_note(note_id, data.category, data.note, data.is_pinned)
    if success:
        return schemas.SuccessResponse(message="Note updated")
    raise HTTPException(status_code=500, detail="Failed to update note")


@router.delete("/api/notes/{note_id}", response_model=schemas.SuccessResponse)
async def delete_note(
    note_id: int,
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    success = await note_service.delete_note(note_id)
    if success:
        return schemas.SuccessResponse(message="Note deleted")
    raise HTTPException(status_code=500, detail="Failed to delete note")
