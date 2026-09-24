from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from fastapi_app.models.notes import Note, NoteCategory
from fastapi_app.schemas.notes import CategoryCreate
from fastapi_app.services.note_transactions import commit

class CategoryService:
    @staticmethod
    async def get_categories(session: AsyncSession):
        stmt = select(NoteCategory)
        result = await session.execute(stmt)
        return result.scalars().all()


    @staticmethod
    async def create_category(session: AsyncSession, data: CategoryCreate):
        cat = NoteCategory(**data.model_dump())
        session.add(cat)
        await commit(session)
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
        if 'color' in data.model_fields_set:
            cat.color = data.color
        await commit(session)
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
        await session.execute(
            update(Note).where(Note.category_id == category_id).values(category_id=None, revision=Note.revision + 1)
        )

        await session.delete(cat)
        await commit(session)
        return {"status": "deleted", "id": category_id}
