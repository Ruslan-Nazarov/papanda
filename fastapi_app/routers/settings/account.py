from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import RedirectResponse
from typing import Any

from ...services.auth import check_auth_dependency, get_current_user_from_cookie, COOKIE_NAME, create_access_token
from ...services.account_service import AccountService
from ...dependencies import get_account_service
from ... import schemas

router = APIRouter(
    dependencies=[Depends(check_auth_dependency)]
)

@router.post("/settings/update_account", name="update_account")
async def update_account(
    request: Request,
    account_service: AccountService = Depends(get_account_service),
) -> RedirectResponse:
    """Обновляет имя пользователя или пароль."""
    try:
        form_data = await request.form()
        data = schemas.AccountUpdateSchema(**dict(form_data))
    except Exception:
        return RedirectResponse(url="/settings?error=validation", status_code=status.HTTP_303_SEE_OTHER)

    current_username = get_current_user_from_cookie(request)
    if not current_username:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

    user, new_token_sub = await account_service.update_user(current_username, data.username, data.password)
    
    response = RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
    if new_token_sub:
        new_token = create_access_token(data={"sub": new_token_sub})
        response.set_cookie(key=COOKIE_NAME, value=new_token, httponly=True, max_age=2592000, samesite="lax")

    return response
