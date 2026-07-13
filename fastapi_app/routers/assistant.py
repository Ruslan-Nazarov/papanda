from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from ..services.assistant_service import generate_assistant_response
from ..logger import logger

router = APIRouter(
    prefix="/api/v1/assistant",
    tags=["assistant"]
)


class AssistantRequest(BaseModel):
    query: str = Field(..., description="Запрос пользователя к ИИ-помощнику")
    page: Optional[str] = Field(None, description="Контекст текущей страницы пользователя")
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="История диалога [{role: 'user'|'assistant', content: '...'}]")


class AssistantResponse(BaseModel):
    answer: str = Field(..., description="Ответ ИИ-помощника")


@router.post("", response_model=AssistantResponse, status_code=status.HTTP_200_OK)
@router.post("/", response_model=AssistantResponse, status_code=status.HTTP_200_OK)
async def ask_assistant(request: AssistantRequest) -> AssistantResponse:
    """Обрабатывает запрос пользователя к ИИ-помощнику по функционалу приложения."""
    query_text = request.query.strip()
    if not query_text: raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Запрос не может быть пустым."
    )

    try:
        answer = await generate_assistant_response(query_text, page=request.page, history=request.history)
        return AssistantResponse(answer=answer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing assistant request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера при обработке запроса."
        )
