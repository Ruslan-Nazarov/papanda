from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from fastapi_app.models.notes import NoteVersion
from fastapi_app.schemas.notes import NoteVersionCreate
from fastapi_app.services.note_transactions import get_note, commit, require_revision

class HistoryService:
    @staticmethod
    async def create_checkpoint(session: AsyncSession, note_id: int, title: str, is_manual: bool = True):
        """
        Two-tier versioning:
        - autosave (every 30s) = just updates data, no version created (update_note above)
        - checkpoint = creates a named version snapshot

        Limits: max 10 auto-checkpoints (session snapshots), unlimited manual ones.
        """
        note = await get_note(session, note_id)

        new_version = NoteVersion(
            note_id=note.id,
            title=title,
            content_json=note.content_json,
            is_manual=is_manual
        )
        session.add(new_version)
        await commit(session, flush_only=True)

        if not is_manual:
            # Enforce max 10 auto-checkpoints (session snapshots)
            stmt_auto = select(NoteVersion).where(
                NoteVersion.note_id == note_id,
                NoteVersion.is_manual == False
            ).order_by(NoteVersion.created_at.desc())
            result_auto = await session.execute(stmt_auto)
            all_auto = result_auto.scalars().all()

            if len(all_auto) > 10:
                ids_to_delete = [v.id for v in all_auto[10:]]
                await session.execute(delete(NoteVersion).where(NoteVersion.id.in_(ids_to_delete)))

        await commit(session)
        await session.refresh(new_version)
        return new_version


    @staticmethod
    async def get_versions(session: AsyncSession, note_id: int):
        await get_note(session, note_id) # Validates existence
        stmt = select(NoteVersion).where(NoteVersion.note_id == note_id).order_by(NoteVersion.created_at.desc())
        result = await session.execute(stmt)
        return result.scalars().all()


    @staticmethod
    async def create_version(session: AsyncSession, note_id: int, data: NoteVersionCreate):
        note = await get_note(session, note_id)
        new_v = NoteVersion(
            note_id=note.id,
            title=data.title,
            content_json=note.content_json,
            is_manual=data.is_manual
        )
        session.add(new_v)
        await commit(session)
        await session.refresh(new_v)
        return new_v


    @staticmethod
    async def restore_version(session: AsyncSession, note_id: int, version_id: int, revision: int):
        note = await get_note(session, note_id)
        require_revision(note, revision)

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
        await commit(session)
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
        await commit(session)
        return version


    @staticmethod
    async def delete_version(session: AsyncSession, note_id: int, version_id: int):
        stmt = select(NoteVersion).where(NoteVersion.id == version_id, NoteVersion.note_id == note_id)
        result = await session.execute(stmt)
        version = result.scalar_one_or_none()
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        await session.delete(version)
        await commit(session)
        return {"status": "success"}
