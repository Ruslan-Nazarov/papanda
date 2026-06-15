from fastapi import APIRouter, Depends, Form, HTTPException, status, Body
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, Any, Dict, Union, List
from ..database import get_db, get_main_db
from ..services.auth import check_auth_dependency
from ..dependencies import get_note_service, get_admin_service
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
    sticker_ids: Optional[str] = Form(None),
    note_service: Any = Depends(get_note_service),
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

    if sticker_ids:
        try:
            import json
            parsed_ids = json.loads(sticker_ids)
            if isinstance(parsed_ids, list):
                if sticker_data is None:
                    sticker_data = {}
                sticker_data["ids"] = parsed_ids
        except:
            pass

    note_id = await note_service.add_note(category, note, sticker_data=sticker_data, is_pinned=is_pinned)
    return JSONResponse(content={
        "status": "success", 
        "message": "Note saved", 
        "id": note_id
    })


@router.post("/api/notes/{note_id}/toggle-pin", response_model=schemas.SuccessResponse)
async def toggle_pin_note(
    note_id: int,
    note_service: Any = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    note = await note_service.db.get(models.Notes, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.is_pinned = not note.is_pinned
    await note_service.db.commit()
    status_str = "pinned" if note.is_pinned else "unpinned"
    return schemas.SuccessResponse(message=f"Note {status_str}")


@router.get("/api/notes/pinned", response_model=List[schemas.NoteView])
async def get_pinned_notes(
    note_service: Any = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    return await note_service.get_pinned_notes()


@router.get("/api/notes/search")
async def search_all_notes(
    query: Optional[str] = None,
    db: Any = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
):
    """Глобальный поиск по всем заметкам (плоская сериализация для избежания рекурсии)."""
    from sqlalchemy import select, or_
    stmt = select(models.Notes)
    if query:
        stmt = stmt.where(or_(
            models.Notes.note.ilike(f"%{query}%"),
            models.Notes.category.ilike(f"%{query}%")
        ))
    stmt = stmt.order_by(models.Notes.created_at.desc())
    res = await db.execute(stmt)
    records = res.scalars().all()
    
    return [
        {
            "id": r.id, 
            "note": r.note, 
            "category": r.category or "General", 
            "is_pinned": bool(r.is_pinned)
        } for r in records
    ]


@router.get("/api/notes/{note_id}", response_model=schemas.NoteView)
async def get_note(
    note_id: int,
    note_service: Any = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    try:
        note = await note_service.get_note(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        return note
    except Exception as e:
        from ..logger import logger
        logger.error(f"Error in get_note router: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/notes/{note_id}/update", response_model=schemas.SuccessResponse)
async def update_note(
    note_id: int,
    note: str = Form(...),
    category: str = Form("General"),
    is_pinned: bool = Form(True),
    sticker_ids: Optional[str] = Form(None),
    note_service: Any = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    parsed_sticker_ids = None
    if sticker_ids:
        try:
            import json
            parsed_ids = json.loads(sticker_ids)
            if isinstance(parsed_ids, list):
                parsed_sticker_ids = parsed_ids
        except:
            pass

    # We need to update note_service.update_note to accept sticker_ids
    # For now, let's just ignore them or add a method to update them.
    # We will pass them if the service supports it.
    success = await note_service.update_note(note_id, category, note, is_pinned)
    if success:
        return schemas.SuccessResponse(message="Note updated")
    raise HTTPException(status_code=500, detail="Failed to update note")


@router.delete("/api/notes/{note_id}", response_model=schemas.SuccessResponse)
async def delete_note(
    note_id: int,
    note_service: Any = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    success = await note_service.delete_note(note_id)
    if success:
        return schemas.SuccessResponse(message="Note deleted")
    raise HTTPException(status_code=500, detail="Failed to delete note")

@router.post("/api/notes/categories", response_model=schemas.SuccessResponse)
async def add_category(
    name: str = Body(..., embed=True),
    note_service: Any = Depends(get_note_service),
    user: Any = Depends(check_auth_dependency)
):
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    success = await note_service.add_category(name)
    if success:
        return schemas.SuccessResponse(message="Category added")
    raise HTTPException(status_code=500, detail="Failed to add category")




