"""Read old activity and store AI requests without changing note content."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi_app.models.notes import Note, NoteActivity
from fastapi_app.schemas.ai_diary import ActivityCreate
from fastapi_app.services.note_transactions import get_note, commit


class AIDiaryService:
    @staticmethod
    async def all_activity(session: AsyncSession):
        rows = await session.execute(select(NoteActivity, Note.title).join(
            Note, Note.id == NoteActivity.note_id).order_by(NoteActivity.created_at, NoteActivity.id))
        return [{'id': event.id, 'note_id': event.note_id, 'note_title': title,
                 'kind': event.kind, 'data': event.data_json, 'created_at': event.created_at}
                for event, title in rows]

    @staticmethod
    async def activity(session: AsyncSession, note_id: int):
        await get_note(session, note_id)
        rows = await session.execute(select(NoteActivity).where(NoteActivity.note_id == note_id)
                                     .order_by(NoteActivity.created_at, NoteActivity.id))
        return rows.scalars().all()

    @staticmethod
    async def add_activity(session: AsyncSession, note_id: int, data: ActivityCreate):
        note = await get_note(session, note_id)
        if note.is_deleted:
            raise HTTPException(404, 'Not found')
        event = NoteActivity(note_id=note_id, kind=data.kind,
                             data_json=data.model_dump(exclude_none=True))
        session.add(event)
        await commit(session)
        await session.refresh(event)
        return event
