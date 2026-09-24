from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from fastapi_app.models.notes import Note, NoteConnection
from fastapi_app.services.note_transactions import get_note, commit

class ConnectionService:
    @staticmethod
    async def get_connections(session: AsyncSession, note_id: int):
        await get_note(session, note_id)
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
        if note_id_from == note_id_to:
            raise HTTPException(status_code=400, detail="Cannot connect note to itself")

        # Both ends must exist before the FK constraint is reached.
        await get_note(session, note_id_from)
        target = await get_note(session, note_id_to)

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
        await commit(session)
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
        stmt = select(NoteConnection).where(NoteConnection.id == connection_id)
        result = await session.execute(stmt)
        conn = result.scalar_one_or_none()
        if not conn:
            raise HTTPException(status_code=404, detail="Connection not found")

        await session.delete(conn)
        await commit(session)
        return {"status": "success", "message": "Connection deleted"}
