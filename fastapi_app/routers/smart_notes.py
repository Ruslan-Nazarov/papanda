from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
from typing import List, Any, Optional
from .. import models

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..config import templates
from ..logger import logger
from ..models.smart_notes import SmartNote
from ..schemas import SmartNoteCreate, SmartNoteView, SmartNoteUpdate, StickyNoteCreate
from ..services.sticky_note_service import StickyNoteService
from ..dependencies import get_sticky_note_service

router = APIRouter(
    tags=["smart_notes"]
)

@router.get("/smart_notes", response_class=HTMLResponse)
async def view_smart_notes(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """Отображает страницу 'умных заметок'."""
    categories_res = await db.execute(select(models.NoteCategory))
    categories = [c.name for c in categories_res.scalars().all()]
    
    return templates.TemplateResponse("smart_notes.html", {
        "request": request,
        "categories": categories
    })

@router.post("/api/smart_notes/save", response_model=SmartNoteView)
async def save_smart_note(
    data: SmartNoteCreate,
    db: AsyncSession = Depends(get_db),
    sns: StickyNoteService = Depends(get_sticky_note_service),
    user: Any = Depends(check_auth_dependency)
) -> SmartNote:
    """Сохраняет новую 'умную заметку' (с блоками содержимого)."""
    # Removed auto-unpinning to allow multiple pinned notes

    # Convert blocks back to standard dicts before dumping
    content_json = json.dumps([b.model_dump() for b in data.blocks], ensure_ascii=False)
    new_note = SmartNote(
        title=data.title or "Untitled Note",
        category=data.category,
        content_json=content_json,
        is_pinned=data.is_pinned
    )
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)

    # Handle sticker
    if data.sticker_text or data.sticker_title:
        s_data = {
            "text": data.sticker_text or "",
            "title": data.sticker_title,
            "color": data.sticker_color or "#fff9c4",
            "type": data.sticker_type or "text",
            "smart_note_id": new_note.id
        }
        await sns.create_note(s_data)

    return new_note

@router.get("/api/smart_notes", response_model=List[SmartNoteView])
async def list_smart_notes(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список всех 'умных заметок' с возможностью поиска."""
    query = select(SmartNote)
    if search:
        query = query.where(SmartNote.title.ilike(f"%{search}%"))
    result = await db.execute(query.order_by(SmartNote.updated_at.desc()))
    return result.scalars().all()

@router.get("/api/smart_notes/{note_id}", response_model=SmartNoteView)
async def get_smart_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> SmartNote:
    """Возвращает содержимое конкретной 'умной заметки'."""
    note = await db.get(SmartNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.put("/api/smart_notes/{note_id}", response_model=SmartNoteView)
async def update_smart_note(
    note_id: int,
    data: SmartNoteUpdate,
    db: AsyncSession = Depends(get_db),
    sns: StickyNoteService = Depends(get_sticky_note_service),
    user: Any = Depends(check_auth_dependency)
) -> SmartNote:
    """Обновляет существующую 'умную заметку'."""
    note = await db.get(SmartNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Convert blocks back to standard dicts before dumping
    content_json = json.dumps([b.model_dump() for b in data.blocks], ensure_ascii=False)
    
    note.title = data.title
    note.category = data.category
    note.content_json = content_json
    
    if data.is_pinned is not None:
        # Removed auto-unpinning
        note.is_pinned = data.is_pinned
    
    await db.commit()
    await db.refresh(note)

    # Handle sticker
    if data.sticker_text or data.sticker_title:
        # Check if sticker already exists for this smart note
        result = await db.execute(select(models.StickyNote).where(
            models.StickyNote.smart_note_id == note.id,
            models.StickyNote.finished_at.is_(None)
        ).limit(1))
        existing_sticker = result.scalar_one_or_none()
        
        s_payload = {
            "text": data.sticker_text or "",
            "title": data.sticker_title,
            "color": data.sticker_color or "#fff9c4",
            "type": data.sticker_type or "text",
            "smart_note_id": note.id
        }
        
        if existing_sticker:
            await sns.update_note(
                existing_sticker.id, 
                text=s_payload["text"], 
                title=s_payload["title"], 
                color=s_payload["color"], 
                note_type=s_payload["type"]
            )
        else:
            await sns.create_note(s_payload)

    return note

@router.get("/api/smart_notes/pinned/active", response_model=Optional[SmartNoteView])
async def get_pinned_smart_note(
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Optional[SmartNote]:
    """Возвращает текущую закрепленную заметку."""
    result = await db.execute(select(SmartNote).where(SmartNote.is_pinned == True).limit(1))
    return result.scalar_one_or_none()

@router.post("/api/smart_notes/{note_id}/pin", response_model=SmartNoteView)
async def pin_smart_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> SmartNote:
    """Закрепляет конкретную заметку."""
    note = await db.get(SmartNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.is_pinned = True
    await db.commit()
    await db.refresh(note)
    return note

@router.post("/api/smart_notes/{note_id}/unpin", response_model=SmartNoteView)
async def unpin_smart_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> SmartNote:
    """Открепляет конкретную заметку."""
    note = await db.get(SmartNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.is_pinned = False
    await db.commit()
    await db.refresh(note)
    return note

@router.delete("/api/smart_notes/{note_id}")
async def delete_smart_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> JSONResponse:
    """Удаляет 'умную заметку'."""
    note = await db.get(SmartNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    await db.delete(note)
    await db.commit()
    return JSONResponse(content={"status": "success", "message": "Note deleted"})
