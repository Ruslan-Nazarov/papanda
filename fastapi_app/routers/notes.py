from fastapi import APIRouter, Depends, Query, Request, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Annotated

from fastapi_app.database import get_db, get_public_db
from fastapi_app.schemas.notes import (
    NoteCreate, NoteUpdate, NoteView,
    CategoryCreate, CategoryUpdate, CategoryView,
    NoteVersionCreate, NoteVersionView,
    ConnectionCreate, ConnectionView
)
from fastapi_app.schemas.notes import Status, RevisionRequest, PublicNoteView
from fastapi_app.services.notes_service import NotesService
from fastapi_app.services.learning_service import LearningService
from fastapi_app.schemas.learning import ForkRequest, ActivityCreate, GoalUpdate

PositiveId = Annotated[int, Path(gt=0)]

router = APIRouter()

# Categories
@router.get("/categories/all", response_model=List[CategoryView])
async def get_all_categories(db: AsyncSession = Depends(get_db)):
    return await NotesService.get_categories(db)

@router.post("/categories/new", response_model=CategoryView)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    return await NotesService.create_category(db, data)

@router.put("/categories/{category_id}", response_model=CategoryView)
async def update_category(category_id: PositiveId, data: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    return await NotesService.update_category(db, category_id, data)

@router.delete("/categories/{category_id}")
async def delete_category(category_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.delete_category(db, category_id)

# Trash
@router.get("/trash/list", response_model=List[NoteView])
async def get_trash(db: AsyncSession = Depends(get_db)):
    return await NotesService.get_trash(db)

@router.post("/{note_id}/restore", response_model=NoteView)
async def restore_note(note_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.restore_note(db, note_id)

@router.delete("/{note_id}/permanent")
async def permanent_delete(note_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.permanent_delete(db, note_id)

# Versions
@router.get("/{note_id}/versions", response_model=List[NoteVersionView])
async def get_versions(note_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.get_versions(db, note_id)

@router.post("/{note_id}/versions", response_model=NoteVersionView)
async def create_version(note_id: PositiveId, data: NoteVersionCreate, db: AsyncSession = Depends(get_db)):
    return await NotesService.create_version(db, note_id, data)

@router.post("/{note_id}/checkpoint", response_model=NoteVersionView)
async def create_checkpoint(note_id: PositiveId, data: NoteVersionCreate, db: AsyncSession = Depends(get_db)):
    """Create a named checkpoint (session snapshot or manual pin)."""
    return await NotesService.create_checkpoint(db, note_id, title=data.title, is_manual=data.is_manual)

@router.post("/{note_id}/versions/{version_id}/restore", response_model=NoteView)
async def restore_version(note_id: PositiveId, version_id: PositiveId, data: RevisionRequest, db: AsyncSession = Depends(get_db)):
    return await NotesService.restore_version(db, note_id, version_id, data.revision)

@router.post("/{note_id}/versions/{version_id}/pin", response_model=NoteVersionView)
async def pin_version(note_id: PositiveId, version_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.pin_version(db, note_id, version_id)

@router.delete("/{note_id}/versions/{version_id}")
async def delete_version(note_id: PositiveId, version_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.delete_version(db, note_id, version_id)

@router.post("/{note_id}/versions/{version_id}/unpin", response_model=NoteVersionView)
async def unpin_version(note_id: PositiveId, version_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.pin_version(db, note_id, version_id, is_manual=False)

# Sharing (публичная ссылка на конспект, только чтение)
@router.post("/{note_id}/share")
async def share_note(note_id: PositiveId, request: Request, db: AsyncSession = Depends(get_db)):
    token = await NotesService.enable_sharing(db, note_id, request.state.session_id)
    return {"token": token, "path": f"/s/{token}"}

@router.delete("/{note_id}/share")
async def unshare_note(note_id: PositiveId, db: AsyncSession = Depends(get_db)):
    await NotesService.disable_sharing(db, note_id)
    return {"ok": True}

@router.get("/shared/{token}", response_model=PublicNoteView)
async def get_shared_note_api(token: str, db: AsyncSession = Depends(get_public_db)):
    return NotesService.public_view(await NotesService.get_shared_note(db, token))

# Learning variants and significant actions
@router.get('/{note_id}/variants', response_model=List[NoteView])
async def get_variants(note_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await LearningService.variants(db, note_id)

@router.post('/{note_id}/variants', response_model=NoteView)
async def fork_variant(note_id: PositiveId, data: ForkRequest, request: Request, db: AsyncSession = Depends(get_db)):
    return await LearningService.fork(db, note_id, data, getattr(request.state, 'locale', 'ru'))

@router.get('/{note_id}/activity')
async def get_activity(note_id: PositiveId, db: AsyncSession = Depends(get_db)):
    rows = await LearningService.activity(db, note_id)
    return [{'id': row.id, 'kind': row.kind, 'data': row.data_json,
             'created_at': row.created_at} for row in rows]

@router.post('/{note_id}/activity')
async def add_activity(note_id: PositiveId, data: ActivityCreate, db: AsyncSession = Depends(get_db)):
    row = await LearningService.add_activity(db, note_id, data)
    return {'id': row.id, 'kind': row.kind, 'data': row.data_json, 'created_at': row.created_at}

@router.patch('/{note_id}/goal', response_model=NoteView)
async def set_long_term_goal(note_id: PositiveId, data: GoalUpdate, db: AsyncSession = Depends(get_db)):
    return await LearningService.set_goal(db, note_id, data.revision, data.long_term_goal)

# Guide
@router.get("/guide", deprecated=True)
async def get_guide():
    return {"content": "# Руководство\n\nЗдесь будет инструкция по работе с конспектами."}

# Main CRUD
@router.get("", response_model=List[NoteView])
async def get_notes(
    request: Request,
    search: Optional[str] = None, 
    category_id: Optional[int] = None, 
    db: AsyncSession = Depends(get_db)
):
    locale = getattr(request.state, 'locale', 'ru')
    return await NotesService.get_all_notes(db, search, category_id, locale)

@router.get("/pinned/active", response_model=Optional[NoteView], deprecated=True)
async def get_active_pinned_note(db: AsyncSession = Depends(get_db)):
    return await NotesService.get_active_pinned_note(db)

@router.get("/search/notes", response_model=List[NoteView], deprecated=True)
async def search_notes(q: str = Query(...), db: AsyncSession = Depends(get_db)):
    return await NotesService.get_all_notes(db, search=q)

@router.post("/save", response_model=NoteView)
async def create_note(data: NoteCreate, db: AsyncSession = Depends(get_db)):
    return await NotesService.create_note(db, data)

@router.get("/{note_id}", response_model=NoteView)
async def get_note(note_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.get_note(db, note_id)

@router.patch("/{note_id}", response_model=NoteView)
async def update_note(note_id: PositiveId, data: NoteUpdate, db: AsyncSession = Depends(get_db)):
    return await NotesService.update_note(db, note_id, data)

@router.delete("/{note_id}")
async def delete_note(note_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.delete_note(db, note_id)

@router.post("/{note_id}/status", response_model=NoteView, deprecated=True)
async def update_note_status(note_id: PositiveId, status: Status = Query(...), revision: int = Query(..., ge=1), db: AsyncSession = Depends(get_db)):
    update_data = NoteUpdate(status=status, revision=revision)
    return await NotesService.update_note(db, note_id, update_data)

@router.post("/{note_id}/pin", response_model=NoteView)
async def pin_note(note_id: PositiveId, revision: int = Query(..., ge=1), db: AsyncSession = Depends(get_db)):
    update_data = NoteUpdate(is_pinned=True, revision=revision)
    return await NotesService.update_note(db, note_id, update_data)

@router.post("/{note_id}/unpin", response_model=NoteView, deprecated=True)
async def unpin_note(note_id: PositiveId, revision: int = Query(..., ge=1), db: AsyncSession = Depends(get_db)):
    update_data = NoteUpdate(is_pinned=False, revision=revision)
    return await NotesService.update_note(db, note_id, update_data)

# Connections
@router.get("/{note_id}/connections", response_model=List[ConnectionView])
async def get_connections(note_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.get_connections(db, note_id)

@router.post("/{note_id}/connections", response_model=ConnectionView)
async def create_connection(note_id: PositiveId, data: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    return await NotesService.create_connection(db, note_id, data.note_id_to, data.label)

@router.delete("/connections/{connection_id}")
async def delete_connection(connection_id: PositiveId, db: AsyncSession = Depends(get_db)):
    return await NotesService.delete_connection(db, connection_id)
