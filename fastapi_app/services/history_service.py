import asyncio
import secrets
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from fastapi_app.models.notes import NoteVersion
from fastapi_app.schemas.notes import NoteVersionCreate
from fastapi_app.services.note_transactions import get_note, commit, require_revision
from fastapi_app.services.security_store import register_share, remove_share

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
            note_notice=note.note_notice,
            content_json=note.content_json,
            stickers=note.stickers,
            dictionary=note.dictionary,
            math_symbols=note.math_symbols,
            is_manual=is_manual
        )
        session.add(new_version)
        await commit(session, flush_only=True)

        if not is_manual:
            # Enforce max 10 auto-checkpoints (session snapshots)
            stmt_auto = select(NoteVersion).where(
                NoteVersion.note_id == note_id,
                NoteVersion.is_manual == False, NoteVersion.material_token.is_(None)
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
            note_notice=note.note_notice,
            content_json=note.content_json,
            stickers=note.stickers,
            dictionary=note.dictionary,
            math_symbols=note.math_symbols,
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

        # Restoring identical content is a no-op, not another backup of itself.
        if (note.content_json == version.content_json and note.note_notice == version.note_notice
                and note.stickers == version.stickers
                and note.dictionary == version.dictionary and note.math_symbols == version.math_symbols):
            return note

        # Create safety backup
        safety_v = NoteVersion(
            note_id=note.id,
            title=f"Перед восстановлением: {version.title}",
            note_notice=note.note_notice,
            content_json=note.content_json,
            stickers=note.stickers,
            dictionary=note.dictionary,
            math_symbols=note.math_symbols,
            is_manual=True
        )
        session.add(safety_v)

        note.content_json = version.content_json
        note.note_notice = version.note_notice
        note.stickers = version.stickers
        note.dictionary = version.dictionary
        note.math_symbols = version.math_symbols
        await commit(session)
        await session.refresh(note)
        return note


    @staticmethod
    async def pin_version(session: AsyncSession, note_id: int, version_id: int, is_manual: bool = True):
        stmt = select(NoteVersion).where(NoteVersion.id == version_id, NoteVersion.note_id == note_id)
        result = await session.execute(stmt)
        version = result.scalar_one_or_none()
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        if version.material_token and not is_manual:
            raise HTTPException(status_code=409, detail="Unlock the material before unpinning")

        version.is_manual = is_manual
        await commit(session)
        return version


    @staticmethod
    async def delete_version(session: AsyncSession, note_id: int, version_id: int):
        stmt = select(NoteVersion).where(NoteVersion.id == version_id, NoteVersion.note_id == note_id)
        result = await session.execute(stmt)
        version = result.scalar_one_or_none()
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        if version.material_token:
            raise HTTPException(status_code=409, detail="Unlock the material before deleting")

        await session.delete(version)
        await commit(session)
        return {"status": "success"}

    @staticmethod
    async def publish_version(session: AsyncSession, note_id: int, version_id: int, owner: str):
        note = await get_note(session, note_id)
        if note.is_deleted:
            raise HTTPException(404, 'Not found')
        version = (await session.execute(select(NoteVersion).where(
            NoteVersion.note_id == note_id, NoteVersion.id == version_id))).scalar_one_or_none()
        if not version:
            raise HTTPException(404, 'Version not found')
        if not version.material_token:
            version.material_token = secrets.token_urlsafe(24)
            version.is_manual = True
            await commit(session)
        await asyncio.to_thread(register_share, version.material_token, owner, note_id)
        return version

    @staticmethod
    async def unpublish_version(session: AsyncSession, note_id: int, version_id: int):
        await get_note(session, note_id)
        version = (await session.execute(select(NoteVersion).where(
            NoteVersion.note_id == note_id, NoteVersion.id == version_id))).scalar_one_or_none()
        if not version or not version.material_token:
            raise HTTPException(404, 'Material not found')
        token = version.material_token
        version.material_token = None
        await commit(session)
        await asyncio.to_thread(remove_share, token)
        return version

    @staticmethod
    async def get_materials(session: AsyncSession, note_id: int):
        note = await get_note(session, note_id)
        if note.is_deleted:
            raise HTTPException(404, 'Not found')
        rows = await session.execute(select(NoteVersion).where(
            NoteVersion.note_id == note_id, NoteVersion.material_token.is_not(None))
            .order_by(NoteVersion.created_at.desc()))
        return rows.scalars().all()

    @staticmethod
    async def get_public_material(session: AsyncSession, token: str):
        if not token or len(token) > 32:
            raise HTTPException(404, 'Not found')
        version = (await session.execute(select(NoteVersion).where(
            NoteVersion.material_token == token))).scalar_one_or_none()
        if not version:
            raise HTTPException(404, 'Not found')
        return version
