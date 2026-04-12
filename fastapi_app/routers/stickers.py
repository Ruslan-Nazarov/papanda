from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List
from ..dependencies import get_sticky_note_service
from ..services.sticky_note_service import StickyNoteService
from ..services.auth import check_auth_dependency
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/stickers",
    tags=["stickers"]
)

class StickerCreate(BaseModel):
    text: str
    title: str | None = None
    color: str = "#fff9c4"
    type: str = "text"

class StickerUpdate(BaseModel):
    text: str | None = None
    title: str | None = None
    color: str | None = None
    type: str | None = None

@router.get("/")
async def get_stickers(service: StickyNoteService = Depends(get_sticky_note_service), user=Depends(check_auth_dependency)):
    notes = await service.get_active_notes()
    return notes

@router.post("/")
async def create_sticker(data: StickerCreate, service: StickyNoteService = Depends(get_sticky_note_service), user=Depends(check_auth_dependency)):
    return await service.create_note(text=data.text, title=data.title, color=data.color, note_type=data.type)

@router.patch("/{note_id}")
async def update_sticker(note_id: int, data: StickerUpdate, service: StickyNoteService = Depends(get_sticky_note_service), user=Depends(check_auth_dependency)):
    note = await service.update_note(note_id=note_id, text=data.text, title=data.title, color=data.color, note_type=data.type)
    if not note:
        raise HTTPException(status_code=404, detail="Sticker not found")
    return note

@router.delete("/{note_id}")
async def delete_sticker(note_id: int, service: StickyNoteService = Depends(get_sticky_note_service), user=Depends(check_auth_dependency)):
    success = await service.delete_note(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sticker not found")
    return {"status": "success"}

@router.post("/reorder")
async def reorder_stickers(note_ids: List[int] = Body(...), service: StickyNoteService = Depends(get_sticky_note_service), user=Depends(check_auth_dependency)):
    await service.reorder_notes(note_ids)
    return {"status": "success"}
