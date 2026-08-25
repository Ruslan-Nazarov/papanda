import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from fastapi_app.models.notes import Note, NoteCategory, NoteVersion
from fastapi_app.schemas.notes import NoteCreate, NoteUpdate, CategoryCreate, NoteVersionCreate
from datetime import datetime, timezone

class NotesService:
    @staticmethod
    async def get_all_notes(session: AsyncSession, search: str = None, category_id: int = None, locale: str = 'ru'):
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
        
        # Translate protected examples based on locale
        for note in notes:
            if note.title in ["Example Note", "Пример конспекта", "Конспект мысалы"]:
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
        blocks_data = [b.model_dump() for b in data.blocks]
        
        import uuid
        new_note = Note(
            title=data.title,
            content_json=blocks_data,
            is_pinned=data.is_pinned,
            category_id=data.category_id,
            status=data.status,
            sticker_text=data.sticker_text,
            sticker_color=data.sticker_color,
            sync_id=str(uuid.uuid4())
        )
        session.add(new_note)
        await session.flush()
        
        # Create initial manual version
        initial_version = NoteVersion(
            note_id=new_note.id,
            title="Создание конспекта",
            content_json=blocks_data,
            is_manual=True
        )
        session.add(initial_version)
        await session.commit()
        await session.refresh(new_note)
        
        return new_note

    @staticmethod
    async def get_note(session: AsyncSession, note_id: int):
        stmt = select(Note).where(Note.id == note_id)
        result = await session.execute(stmt)
        note = result.scalar_one_or_none()
        if not note:
            raise HTTPException(status_code=404, detail="Entry not found")
        return note

    @staticmethod
    async def get_active_pinned_note(session: AsyncSession):
        stmt = select(Note).where(Note.is_pinned == True, Note.is_deleted == False).order_by(Note.updated_at.desc()).limit(1)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_note(session: AsyncSession, note_id: int, data: NoteUpdate):
        note = await NotesService.get_note(session, note_id)
        
        import uuid
        if not note.sync_id:
            note.sync_id = str(uuid.uuid4())
            
        if data.title is not None:
            note.title = data.title
        if data.is_pinned is not None:
            note.is_pinned = data.is_pinned
        if data.category_id is not None:
            note.category_id = data.category_id
        if data.status is not None:
            note.status = data.status
        if data.sticker_text is not None:
            note.sticker_text = data.sticker_text
        if data.sticker_color is not None:
            note.sticker_color = data.sticker_color
            
        # Blocks update
        if data.blocks is not None:
            new_blocks_data = [b.model_dump() for b in data.blocks]
            note.content_json = new_blocks_data
            
        await session.commit()
        await session.refresh(note)
        
        # Publish logic if status is ready
        if note.status == "ready":
            import json
            import subprocess
            import asyncio
            from pathlib import Path
            from fastapi_app.schemas.notes import NoteView
            
            try:
                # Prepare JSON data
                note_view = NoteView.model_validate(note)
                export_data = note_view.model_dump(mode='json')
                
                BASE_DIR = Path(__file__).resolve().parent.parent.parent
                publish_dir = BASE_DIR / "content" / "published"
                publish_dir.mkdir(parents=True, exist_ok=True)
                
                file_path = publish_dir / f"{note.sync_id}.json"
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(export_data, f, ensure_ascii=False, indent=2)
                    
                # Run git commands in background
                def _run_git():
                    try:
                        subprocess.run(["git", "add", str(file_path)], check=True, cwd=str(Path.cwd()))
                        subprocess.run(["git", "commit", "-m", f"auto-publish note: {note.title}"], check=True, cwd=str(Path.cwd()))
                        subprocess.run(["git", "push", "origin", "main"], check=True, cwd=str(Path.cwd()))
                    except Exception as e:
                        print(f"Git publish failed: {e}")
                
                # Execute synchronously to ensure it happens, or use asyncio.to_thread
                asyncio.create_task(asyncio.to_thread(_run_git))
            except Exception as e:
                print(f"Export failed: {e}")
        
        return note

    @staticmethod
    async def create_checkpoint(session: AsyncSession, note_id: int, title: str, is_manual: bool = True):
        """
        Two-tier versioning:
        - autosave (every 30s) = just updates data, no version created (update_note above)
        - checkpoint = creates a named version snapshot
        
        Limits: max 10 auto-checkpoints (session snapshots), unlimited manual ones.
        """
        note = await NotesService.get_note(session, note_id)
        
        new_version = NoteVersion(
            note_id=note.id,
            title=title,
            content_json=note.content_json,
            is_manual=is_manual
        )
        session.add(new_version)
        await session.flush()
        
        if not is_manual:
            # Enforce max 10 auto-checkpoints (session snapshots)
            stmt_auto = select(NoteVersion).where(
                NoteVersion.note_id == note_id,
                NoteVersion.is_manual == False
            ).order_by(NoteVersion.created_at.desc())
            result_auto = await session.execute(stmt_auto)
            all_auto = result_auto.scalars().all()
            
            if len(all_auto) > 10:
                from sqlalchemy import delete
                ids_to_delete = [v.id for v in all_auto[10:]]
                await session.execute(delete(NoteVersion).where(NoteVersion.id.in_(ids_to_delete)))
        
        await session.commit()
        await session.refresh(new_version)
        return new_version

    @staticmethod
    async def delete_note(session: AsyncSession, note_id: int):
        note = await NotesService.get_note(session, note_id)
        note.is_deleted = True
        note.deleted_at = datetime.now(timezone.utc)
        await session.commit()
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
        await session.commit()
        await session.refresh(note)
        return note

    @staticmethod
    async def permanent_delete(session: AsyncSession, note_id: int):
        note = await NotesService.get_note(session, note_id)
        await session.delete(note)
        await session.commit()
        return {"status": "success", "message": "Note deleted permanently"}

    # Versions
    @staticmethod
    async def get_versions(session: AsyncSession, note_id: int):
        await NotesService.get_note(session, note_id) # Validates existence
        stmt = select(NoteVersion).where(NoteVersion.note_id == note_id).order_by(NoteVersion.created_at.desc())
        result = await session.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def create_version(session: AsyncSession, note_id: int, data: NoteVersionCreate):
        note = await NotesService.get_note(session, note_id)
        new_v = NoteVersion(
            note_id=note.id,
            title=data.title,
            content_json=note.content_json,
            is_manual=data.is_manual
        )
        session.add(new_v)
        await session.commit()
        await session.refresh(new_v)
        return new_v

    @staticmethod
    async def restore_version(session: AsyncSession, note_id: int, version_id: int):
        note = await NotesService.get_note(session, note_id)
        
        stmt = select(NoteVersion).where(NoteVersion.id == version_id, NoteVersion.note_id == note_id)
        result = await session.execute(stmt)
        version = result.scalar_one_or_none()
        
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
            
        # Create safety backup
        safety_v = NoteVersion(
            note_id=note.id,
            title=f"Перед восстановлением: {version.title}",
            content_json=note.content_json,
            is_manual=True
        )
        session.add(safety_v)
        
        note.content_json = version.content_json
        await session.commit()
        await session.refresh(note)
        return note

    @staticmethod
    async def pin_version(session: AsyncSession, note_id: int, version_id: int):
        stmt = select(NoteVersion).where(NoteVersion.id == version_id, NoteVersion.note_id == note_id)
        result = await session.execute(stmt)
        version = result.scalar_one_or_none()
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
            
        version.is_manual = True
        await session.commit()
        return version

    @staticmethod
    async def delete_version(session: AsyncSession, note_id: int, version_id: int):
        stmt = select(NoteVersion).where(NoteVersion.id == version_id, NoteVersion.note_id == note_id)
        result = await session.execute(stmt)
        version = result.scalar_one_or_none()
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
            
        await session.delete(version)
        await session.commit()
        return {"status": "success"}

    # Categories
    @staticmethod
    async def get_categories(session: AsyncSession):
        stmt = select(NoteCategory)
        result = await session.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def create_category(session: AsyncSession, data: CategoryCreate):
        cat = NoteCategory(**data.model_dump())
        session.add(cat)
        await session.commit()
        await session.refresh(cat)
        return cat

    @staticmethod
    async def update_category(session: AsyncSession, category_id: int, data):
        stmt = select(NoteCategory).where(NoteCategory.id == category_id)
        result = await session.execute(stmt)
        cat = result.scalar_one_or_none()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        if data.name is not None:
            cat.name = data.name
        if data.color is not None:
            cat.color = data.color
        await session.commit()
        await session.refresh(cat)
        return cat

    @staticmethod
    async def delete_category(session: AsyncSession, category_id: int):
        stmt = select(NoteCategory).where(NoteCategory.id == category_id)
        result = await session.execute(stmt)
        cat = result.scalar_one_or_none()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Reset category_id for notes in this category
        from sqlalchemy import update
        await session.execute(
            update(Note).where(Note.category_id == category_id).values(category_id=None)
        )
        
        await session.delete(cat)
        await session.commit()
        return {"status": "deleted", "id": category_id}

    @staticmethod
    async def get_connections(session: AsyncSession, note_id: int):
        from fastapi_app.models.notes import NoteConnection
        from sqlalchemy import or_
        
        stmt = select(NoteConnection).where(
            or_(
                NoteConnection.note_id_from == note_id,
                NoteConnection.note_id_to == note_id
            )
        )
        
        result = await session.execute(stmt)
        raw_connections = result.scalars().all()
        
        if not raw_connections:
            return []
            
        target_ids = [c.note_id_to if c.note_id_from == note_id else c.note_id_from for c in raw_connections]
        
        target_stmt = select(Note).options(selectinload(Note.category)).where(Note.id.in_(target_ids))
        target_result = await session.execute(target_stmt)
        targets = {n.id: n for n in target_result.scalars().all()}
        
        connections = []
        for conn in raw_connections:
            target_id = conn.note_id_to if conn.note_id_from == note_id else conn.note_id_from
            target_note = targets.get(target_id)
            if not target_note:
                continue
                
            connections.append({
                "id": conn.id,
                "note_id_from": conn.note_id_from,
                "note_id_to": conn.note_id_to,
                "label": conn.label,
                "created_at": conn.created_at,
                "target_title": target_note.title,
                "target_category": target_note.category.name if target_note.category else None
            })
            
        return connections

    @staticmethod
    async def create_connection(session: AsyncSession, note_id_from: int, note_id_to: int, label: str = "related"):
        from fastapi_app.models.notes import NoteConnection
        if note_id_from == note_id_to:
            raise HTTPException(status_code=400, detail="Cannot connect note to itself")
            
        # Check if target exists
        target = await NotesService.get_note(session, note_id_to)
        
        # Check if connection already exists
        stmt = select(NoteConnection).where(
            NoteConnection.note_id_from == note_id_from,
            NoteConnection.note_id_to == note_id_to
        )
        result = await session.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Connection already exists")
            
        new_conn = NoteConnection(
            note_id_from=note_id_from,
            note_id_to=note_id_to,
            label=label
        )
        session.add(new_conn)
        await session.commit()
        await session.refresh(new_conn)
        
        return {
            "id": new_conn.id,
            "note_id_from": new_conn.note_id_from,
            "note_id_to": new_conn.note_id_to,
            "label": new_conn.label,
            "created_at": new_conn.created_at,
            "target_title": target.title,
            "target_category": target.category.name if target.category else None
        }

    @staticmethod
    async def delete_connection(session: AsyncSession, connection_id: int):
        from fastapi_app.models.notes import NoteConnection
        stmt = select(NoteConnection).where(NoteConnection.id == connection_id)
        result = await session.execute(stmt)
        conn = result.scalar_one_or_none()
        if not conn:
            raise HTTPException(status_code=404, detail="Connection not found")
            
        await session.delete(conn)
        await session.commit()
        return {"status": "success", "message": "Connection deleted"}
