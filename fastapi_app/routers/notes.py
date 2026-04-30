from fastapi import APIRouter, Depends, Form
from fastapi.responses import JSONResponse
from sqlalchemy import select
from typing import Optional, Any, Dict, Union

from ..services.auth import check_auth_dependency
from ..services.note_service import NoteService
from ..dependencies import get_note_service
from .. import models
from ..logger import logger

router = APIRouter(
    tags=["notes"]
)

@router.post("/add_note")
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
) -> JSONResponse:
    """
    Добавляет заметку и возвращает JSON с подтверждением сохранения.
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

    # Сохраняем и получаем ID
    note_id = await note_service.add_note(category, note, sticker_data=sticker_data, is_pinned=is_pinned)

    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "id": note_id,
            "message": "Заметка успешно сохранена"
        }
    )

@router.post("/api/notes/{note_id}/pin")
async def pin_note(
    note_id: int,
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
) -> JSONResponse:
    note = await note_service.db.get(models.Notes, note_id)
    if not note:
        return JSONResponse(status_code=404, content={"status": "error", "message": "Note not found"})
    note.is_pinned = True
    await note_service.db.commit()
    return JSONResponse(status_code=200, content={"status": "success"})

@router.get("/api/notes/pinned")
async def get_pinned_notes(
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
) -> JSONResponse:
    res = await note_service.db.execute(
        select(models.Notes).where(models.Notes.is_pinned == True).order_by(models.Notes.created_at.desc())
    )
    pinned = res.scalars().all()
    
    # Simple serialization
    data = []
    for n in pinned:
        res_s = await note_service.db.execute(
            select(models.StickyNote).where(models.StickyNote.note_id == n.id)
        )
        stickers = res_s.scalars().all()
        data.append({
            "id": n.id,
            "category": n.category,
            "note": n.note,
            "preview": (n.note[:100] + '...') if len(n.note) > 100 else n.note,
            "title": f"[{n.category}]" if n.category else f"Note #{n.id}",
            "stickers": [{"id": s.id, "text": s.text, "color": s.color} for s in stickers]
        })
    return JSONResponse(status_code=200, content=data)

@router.post("/api/notes/{note_id}/unpin")
async def unpin_note(
    note_id: int,
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
) -> JSONResponse:
    note = await note_service.db.get(models.Notes, note_id)
    if not note:
        return JSONResponse(status_code=404, content={"status": "error", "message": "Note not found"})
    note.is_pinned = False
    await note_service.db.commit()
    return JSONResponse(status_code=200, content={"status": "success"})

@router.get("/api/notes/{note_id}")
async def get_note(
    note_id: int,
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
) -> JSONResponse:
    note = await note_service.db.get(models.Notes, note_id)
    if not note:
        return JSONResponse(status_code=404, content={"status": "error", "message": "Note not found"})
    return JSONResponse(status_code=200, content={
        "id": note.id,
        "category": note.category,
        "note": note.note,
        "is_pinned": note.is_pinned
    })

@router.post("/api/notes/{note_id}/update")
async def update_note(
    note_id: int,
    category: str = Form(...),
    note: str = Form(...),
    is_pinned: bool = Form(False),
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
) -> JSONResponse:
    success = await note_service.update_note(note_id, category, note, is_pinned)
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": "Note updated"})
    return JSONResponse(status_code=500, content={"status": "error", "message": "Failed to update note"})

@router.delete("/api/notes/{note_id}")
async def delete_note(
    note_id: int,
    note_service: NoteService = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
) -> JSONResponse:
    success = await note_service.delete_note(note_id)
    if success:
        return JSONResponse(status_code=200, content={"status": "success", "message": "Note deleted"})
    return JSONResponse(status_code=500, content={"status": "error", "message": "Failed to delete note"})
