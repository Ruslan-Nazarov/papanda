from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
from typing import List, Any, Optional
from .. import models, schemas

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..config import templates
from ..logger import logger
from ..models.dialectics import Dialectics
from ..schemas import DialecticsCreate, DialecticsView, DialecticsUpdate, StickyNoteCreate, SuccessResponse
from ..services.sticky_note_service import StickyNoteService
from ..dependencies import get_sticky_note_service

router = APIRouter(
    tags=["dialectics"]
)

@router.get("/dialectics", response_class=HTMLResponse)
async def view_dialectics(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """Отображает страницу 'Диалектики'."""
    return templates.TemplateResponse("dialectics.html", {
        "request": request
    })

@router.post("/api/dialectics/save", response_model=DialecticsView)
async def save_dialectics(
    data: DialecticsCreate,
    db: AsyncSession = Depends(get_db),
    sns: StickyNoteService = Depends(get_sticky_note_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Сохраняет новую запись 'Диалектики'."""
    # Convert blocks back to standard dicts before dumping
    content_json = json.dumps([b.model_dump() for b in data.blocks], ensure_ascii=False)
    new_note = Dialectics(
        title=data.title or "Untitled Dialectics",
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
            "dialectics_id": new_note.id
        }
        await sns.create_note(s_data)

    return new_note

@router.get("/api/dialectics", response_model=List[DialecticsView])
async def list_dialectics(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список записей 'Диалектики'."""
    query = select(Dialectics)
    if search:
        query = query.where(Dialectics.title.ilike(f"%{search}%"))
    result = await db.execute(query.order_by(Dialectics.updated_at.desc()))
    return result.scalars().all()

@router.get("/api/dialectics/{id}", response_model=DialecticsView)
async def get_dialectics(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Возвращает содержимое конкретной записи."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    return note

@router.put("/api/dialectics/{id}", response_model=DialecticsView)
async def update_dialectics(
    id: int,
    data: DialecticsUpdate,
    db: AsyncSession = Depends(get_db),
    sns: StickyNoteService = Depends(get_sticky_note_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Обновляет существующую запись 'Диалектики'."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Convert blocks back to standard dicts before dumping
    content_json = json.dumps([b.model_dump() for b in data.blocks], ensure_ascii=False)
    
    note.title = data.title
    note.content_json = content_json
    
    if data.is_pinned is not None:
        note.is_pinned = data.is_pinned
    
    await db.commit()
    await db.refresh(note)

    # Handle sticker
    if data.sticker_text or data.sticker_title:
        # Check if sticker already exists for this dialectics record
        result = await db.execute(select(models.StickyNote).where(
            models.StickyNote.dialectics_id == note.id,
            models.StickyNote.finished_at.is_(None)
        ).limit(1))
        existing_sticker = result.scalar_one_or_none()
        
        s_payload = {
            "text": data.sticker_text or "",
            "title": data.sticker_title,
            "color": data.sticker_color or "#fff9c4",
            "type": data.sticker_type or "text",
            "dialectics_id": note.id
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

@router.get("/api/dialectics/pinned/active", response_model=Optional[DialecticsView])
async def get_pinned_dialectics(
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Optional[Dialectics]:
    """Возвращает закрепленную запись."""
    result = await db.execute(select(Dialectics).where(Dialectics.is_pinned == True).limit(1))
    return result.scalar_one_or_none()

@router.post("/api/dialectics/{id}/pin", response_model=DialecticsView)
async def pin_dialectics(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Закрепляет запись."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    note.is_pinned = True
    await db.commit()
    await db.refresh(note)
    return note

@router.post("/api/dialectics/{id}/unpin", response_model=DialecticsView)
async def unpin_dialectics(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Открепляет запись."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    note.is_pinned = False
    await db.commit()
    await db.refresh(note)
    return note

@router.delete("/api/dialectics/{id}", response_model=schemas.SuccessResponse)
async def delete_dialectics(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
):
    """Удаляет запись."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    await db.delete(note)
    await db.commit()
    return schemas.SuccessResponse(message="Dialectics entry deleted")
