from fastapi_app.services.history_service import HistoryService
from fastapi_app.services.category_service import CategoryService
from fastapi_app.services.connection_service import ConnectionService
from fastapi_app.services.sharing_service import SharingService
from fastapi_app.services.note_transactions import commit, get_note, require_revision, validate_category
from fastapi_app.services.block_contract import normalize_legacy_blocks
import json
import asyncio
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from fastapi import HTTPException

from fastapi_app.config import settings
from fastapi_app.models.notes import Note, NoteCategory, NoteVersion
from fastapi_app.schemas.notes import NoteCreate, NoteUpdate
from fastapi_app.services.sanitizer import sanitize_on_write
from fastapi_app.services.security_store import remove_share


def _clean_blocks(blocks: list) -> list:
    """Санитизация HTML каждого блока при сохранении (см. sanitize_on_write)."""
    out = []
    for b in blocks:
        if isinstance(b, dict) and b.get("html"):
            b = {**b, "html": sanitize_on_write(b["html"])}
        out.append(b)
    return out


class NotesService(HistoryService, CategoryService, ConnectionService, SharingService):
    @staticmethod
    async def get_all_notes(session: AsyncSession, search: Optional[str] = None, category_id: Optional[int] = None, locale: str = 'ru'):
        stmt = select(Note).where(Note.is_deleted == False)
        
        if category_id:
            stmt = stmt.where(Note.category_id == category_id)
            
        if search:
            stmt = stmt.outerjoin(NoteCategory).where(
                or_(
                    Note.title.ilike(f"%{search}%"),
                    NoteCategory.name.ilike(f"%{search}%")
                )
            )
            
        stmt = stmt.order_by(Note.updated_at.desc().nulls_last(), Note.created_at.desc())
        
        result = await session.execute(stmt)
        notes = list(result.scalars().all())
        
        # Translate example notes based on locale
        for note in notes:
            if note.is_example:
                session.expunge(note)
                if locale == "en":
                    note.title = "Example Note"
                elif locale == "kz":
                    note.title = "Конспект мысалы"
                else:
                    note.title = "Пример конспекта"
                    
        return notes

    @staticmethod
    async def create_note(session: AsyncSession, data: NoteCreate):
        await validate_category(session, data.category_id)
        blocks_data = _clean_blocks([b.model_dump() for b in data.blocks])
        
        new_note = Note(
            title=data.title,
            content_json=blocks_data,
            stickers=[s.model_dump(mode='json') for s in data.stickers],
            is_pinned=data.is_pinned,
            is_example=data.is_example,
            category_id=data.category_id,
            status=data.status,
            sticker_text=data.sticker_text,
            sticker_color=data.sticker_color,
            sync_id=str(uuid.uuid4())
        )
        session.add(new_note)
        await commit(session, flush_only=True)
        
        # Create initial manual version
        initial_version = NoteVersion(
            note_id=new_note.id,
            title="Создание конспекта",
            content_json=blocks_data,
            stickers=new_note.stickers,
            is_manual=True
        )
        session.add(initial_version)
        await commit(session)
        await session.refresh(new_note)
        
        return new_note

    get_note = staticmethod(get_note)


    @staticmethod
    async def get_active_pinned_note(session: AsyncSession):
        stmt = select(Note).where(Note.is_pinned == True, Note.is_deleted == False).order_by(Note.updated_at.desc()).limit(1)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_note(session: AsyncSession, note_id: int, data: NoteUpdate):
        note = await NotesService.get_note(session, note_id)
        require_revision(note, data.revision)
        
        if not note.sync_id:
            note.sync_id = str(uuid.uuid4())
            
        if data.title is not None:
            note.title = data.title
        if data.is_pinned is not None:
            note.is_pinned = data.is_pinned
        if data.is_example is not None:
            note.is_example = data.is_example
        if 'category_id' in data.model_fields_set:
            await validate_category(session, data.category_id)
            note.category_id = data.category_id
        if data.status is not None:
            note.status = data.status
        if data.stickers is not None:
            note.stickers = [s.model_dump(mode='json') for s in data.stickers]
        if 'sticker_text' in data.model_fields_set:
            note.sticker_text = data.sticker_text
        if data.sticker_color is not None:
            note.sticker_color = data.sticker_color
            
        # Blocks update
        if data.blocks is not None:
            note.content_json = _clean_blocks([b.model_dump() for b in data.blocks])
            
        await commit(session)
        await session.refresh(note)
        
        return note


    @staticmethod
    async def delete_note(session: AsyncSession, note_id: int):
        note = await NotesService.get_note(session, note_id)
        if note.is_example:
            raise HTTPException(status_code=400, detail="Cannot delete an example note")
            
        token = note.share_token
        note.share_token = None
        note.is_deleted = True
        note.deleted_at = datetime.now(timezone.utc)
        await commit(session)
        if token:
            await asyncio.to_thread(remove_share, token)
        return {"status": "success", "message": "Entry moved to trash"}

    # Trash
    @staticmethod
    async def get_trash(session: AsyncSession):
        stmt = select(Note).where(Note.is_deleted == True).order_by(Note.deleted_at.desc())
        result = await session.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def restore_note(session: AsyncSession, note_id: int):
        note = await NotesService.get_note(session, note_id)
        note.is_deleted = False
        note.deleted_at = None
        await commit(session)
        await session.refresh(note)
        return note

    @staticmethod
    async def permanent_delete(session: AsyncSession, note_id: int):
        note = await NotesService.get_note(session, note_id)
        if note.is_example:
            raise HTTPException(status_code=400, detail="Cannot permanently delete an example note")
            
        token = note.share_token
        await session.delete(note)
        await commit(session)
        if token:
            await asyncio.to_thread(remove_share, token)
        return {"status": "success", "message": "Note deleted permanently"}


    @staticmethod
    async def export_examples_to_file(session: AsyncSession, filepath: Optional[str] = None):
        target_path = Path(filepath) if filepath else settings.DATA_DIR / "example_notes.json"
        
        stmt = select(Note).where(Note.is_example == True, Note.is_deleted == False)
        result = await session.execute(stmt)
        examples = result.scalars().all()
        
        export_data = []
        for ex in examples:
            export_data.append({
                "title": ex.title,
                "content_json": ex.content_json,
                "stickers": ex.stickers,
                "is_pinned": ex.is_pinned,
                "sticker_text": ex.sticker_text,
                "sticker_color": ex.sticker_color,
                "sync_id": ex.sync_id
            })
            
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
            
        return len(export_data)

    @staticmethod
    async def import_examples_from_file(session: AsyncSession, filepath: Optional[str] = None):
        target_path = Path(filepath) if filepath else settings.DATA_DIR / "example_notes.json"
        
        if not target_path.exists():
            return 0
            
        with open(target_path, "r", encoding="utf-8") as f:
            try:
                examples_data = json.load(f)
            except json.JSONDecodeError:
                return 0
                
        imported_count = 0
        for data in examples_data:
            sync_id = data.get("sync_id")
            if sync_id:
                stmt = select(Note).where(Note.sync_id == sync_id)
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                
                if existing:
                    # Startup seeding must preserve any edits to an existing example.
                    continue
                else:
                    validated = NoteCreate(
                        title=data.get("title", "Пример конспекта"),
                        blocks=normalize_legacy_blocks(data.get("content_json", []), sync_id),
                        stickers=data.get('stickers', []),
                        is_pinned=data.get("is_pinned", False),
                        sticker_text=data.get("sticker_text"),
                        sticker_color=data.get("sticker_color", "#fff9c4"),
                    )
                    new_ex = Note(
                        title=validated.title,
                        content_json=[b.model_dump() for b in validated.blocks],
                        stickers=[s.model_dump(mode='json') for s in validated.stickers],
                        is_pinned=validated.is_pinned,
                        is_example=True,
                        sticker_text=validated.sticker_text,
                        sticker_color=validated.sticker_color,
                        sync_id=sync_id
                    )
                    session.add(new_ex)
                imported_count += 1
                
        if imported_count > 0:
            await commit(session)
            
        return imported_count
