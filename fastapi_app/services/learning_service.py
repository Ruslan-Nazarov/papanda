"""Persistent note variants and meaningful learning events."""
import uuid
import html

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi_app.models.notes import Note, NoteActivity, NoteFamily, NoteVersion
from fastapi_app.schemas.learning import ActivityCreate, ForkRequest
from fastapi_app.services.note_transactions import get_note, require_revision, commit


def _step_number(role):
    if not isinstance(role, str) or not role.startswith('step'):
        return None
    part = role[4:].split('.')[0]
    return int(part) if part in {'1', '2', '3', '4', '5'} else None


class LearningService:
    @staticmethod
    async def variants(session: AsyncSession, note_id: int):
        note = await get_note(session, note_id)
        if note.family_id is None:
            return [note]
        rows = await session.execute(select(Note).where(
            Note.family_id == note.family_id, Note.is_deleted == False
        ).order_by(Note.created_at, Note.id))
        return rows.scalars().all()

    @staticmethod
    async def fork(session: AsyncSession, note_id: int, data: ForkRequest):
        source = await get_note(session, note_id)
        require_revision(source, data.revision)
        if source.is_deleted:
            raise HTTPException(404, 'Not found')
        if source.family_id is None:
            family = NoteFamily()
            session.add(family)
            await session.flush()
            source.family_id = family.id
            source.variant_label = source.variant_label or 'Исходный вариант'
        blocks = [dict(block) for block in source.content_json
                  if _step_number(block.get('role')) is None
                  or _step_number(block.get('role')) < data.from_step]
        for block in blocks:
            if block.get('role') == 'anchor' and block.get('anchorResolved') and block.get('sourceGoal'):
                block['html'] = f"<p>{html.escape(str(block['sourceGoal']))}</p>"
                block['title'] = block.get('sourceTitle') or 'Что нужно понять?'
                block['anchorResolved'] = False
        variant = Note(
            title=source.title, content_json=blocks, stickers=[],
            category_id=source.category_id, status='in_progress',
            sync_id=str(uuid.uuid4()), family_id=source.family_id,
            parent_note_id=source.id, variant_label=data.label.strip(),
            variant_origin=data.origin, fork_step=data.from_step,
            long_term_goal=source.long_term_goal,
        )
        session.add(variant)
        await session.flush()
        session.add(NoteVersion(note_id=variant.id, title='Создание варианта',
                                content_json=blocks, stickers=[], is_manual=True))
        session.add(NoteActivity(note_id=source.id, kind='variant_forked',
                                 data_json={'new_note_id': variant.id, 'from_step': data.from_step,
                                            'label': variant.variant_label, 'origin': data.origin}))
        session.add(NoteActivity(note_id=variant.id, kind='variant_created',
                                 data_json={'parent_note_id': source.id, 'from_step': data.from_step,
                                            'origin': data.origin}))
        await commit(session)
        await session.refresh(variant)
        return variant

    @staticmethod
    async def activity(session: AsyncSession, note_id: int):
        await get_note(session, note_id)
        rows = await session.execute(select(NoteActivity).where(NoteActivity.note_id == note_id)
                                     .order_by(NoteActivity.created_at, NoteActivity.id))
        return rows.scalars().all()

    @staticmethod
    async def add_activity(session: AsyncSession, note_id: int, data: ActivityCreate):
        await get_note(session, note_id)
        event = NoteActivity(note_id=note_id, kind=data.kind,
                             data_json=data.model_dump(exclude_none=True))
        session.add(event)
        await commit(session)
        await session.refresh(event)
        return event

    @staticmethod
    async def set_goal(session: AsyncSession, note_id: int, revision: int, enabled: bool):
        note = await get_note(session, note_id)
        require_revision(note, revision)
        note.long_term_goal = enabled
        session.add(NoteActivity(note_id=note_id, kind='goal_changed',
                                 data_json={'long_term_goal': enabled}))
        await commit(session)
        await session.refresh(note)
        return note
