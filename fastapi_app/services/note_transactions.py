from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.exc import StaleDataError
from fastapi_app.models.notes import Note, NoteCategory


async def get_note(session, note_id):
    note = (await session.execute(select(Note).where(Note.id == note_id))).scalar_one_or_none()
    if note is None:
        raise HTTPException(404, 'Entry not found')
    return note


def require_revision(note, revision):
    if note.revision != revision:
        raise HTTPException(409, 'Revision conflict: keep your edits and reload or save a copy')


async def validate_category(session, category_id):
    if category_id is not None and await session.get(NoteCategory, category_id) is None:
        raise HTTPException(404, 'Category not found')


async def commit(session, *, flush_only=False):
    try:
        if flush_only:
            await session.flush()
        else:
            await session.commit()
    except (IntegrityError, StaleDataError) as error:
        await session.rollback()
        detail = 'Revision conflict: keep your edits and reload or save a copy' if isinstance(error, StaleDataError) else 'Duplicate or invalid related record'
        raise HTTPException(409, detail) from error
