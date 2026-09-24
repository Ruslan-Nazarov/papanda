import asyncio
import secrets
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from fastapi_app.models.notes import Note
from fastapi_app.services.note_transactions import get_note, commit
from fastapi_app.services.security_store import register_share, remove_share
from fastapi_app.services.sanitizer import sanitize_block_html

class SharingService:
    @staticmethod
    async def enable_sharing(session: AsyncSession, note_id: int, owner='local') -> str:
        """Выдать (или вернуть существующий) публичный токен конспекта."""
        note = await get_note(session, note_id)
        if note.is_deleted:
            raise HTTPException(404, 'Not found')
        if not note.share_token:
            await session.execute(update(Note).where(Note.id == note_id).values(share_token=secrets.token_urlsafe(24)))
            await commit(session)
            await session.refresh(note)
        await asyncio.to_thread(register_share, note.share_token, owner, note_id)
        return note.share_token


    @staticmethod
    async def disable_sharing(session: AsyncSession, note_id: int) -> None:
        note = await get_note(session, note_id)
        if note.share_token:
            token = note.share_token
            await session.execute(update(Note).where(Note.id == note_id).values(share_token=None))
            await commit(session)
            await asyncio.to_thread(remove_share, token)


    @staticmethod
    async def get_shared_note(session: AsyncSession, token: str) -> Note:
        """Конспект по публичному токену — БЕЗ привязки к сессии (это и есть шаринг)."""
        if not token or len(token) > 32:
            raise HTTPException(status_code=404, detail="Not found")
        stmt = select(Note).where(Note.share_token == token, Note.is_deleted == False)
        note = (await session.execute(stmt)).scalar_one_or_none()
        if not note:
            raise HTTPException(status_code=404, detail="Not found")
        return note

    @staticmethod
    def public_view(note):
        return {'title': note.title, 'schema_version': note.schema_version, 'content_json': [
            {'id': b.get('id'), 'role': b.get('role'), 'title': b.get('title'),
             'side': b.get('side', 'center'), 'html': sanitize_block_html(b.get('html', ''))}
            for b in note.content_json if isinstance(b, dict)
        ]}
