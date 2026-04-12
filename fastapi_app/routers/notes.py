from fastapi import APIRouter, Depends, Form
from fastapi.responses import JSONResponse
from sqlalchemy import select
from ..services.auth import check_auth_dependency
from ..services.note_service import NoteService
from ..dependencies import get_note_service
from .. import models
from ..logger import logger

router = APIRouter(
    tags=["notes"]
)

@router.post("/add_note")
async def add_note(
    category: str | None = Form(default=None, min_length=1, max_length=50),
    note: str = Form(..., min_length=1, max_length=10000),
    note_service: NoteService = Depends(get_note_service),
    user=Depends(check_auth_dependency)
):
    """
    Добавляет заметку и возвращает JSON с подтверждением сохранения.
    ✅ Поддержка проверки через перечитывание из БД.
    """
    try:
        if not category:
            result = await note_service.db.execute(select(models.NoteCategory).limit(1))
            first_cat = result.scalar_one_or_none()
            category = first_cat.name if first_cat else "default"

        # Сохраняем и получаем ID (с проверкой через перечитывание)
        note_id = await note_service.add_note(category, note)

        # ✅ УСПЕХ! Возвращаем JSON подтверждение
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "id": note_id,
                "message": "Заметка успешно сохранена"
            }
        )
    except Exception as e:
        logger.error(f"Error adding note: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Ошибка при сохранении заметки"
            }
        )
