from fastapi import APIRouter, Depends, Request, Form, status, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import re
from typing import Optional, List, Dict, Any, Union

from .. import models
from ..database import get_db, get_main_db
from ..logger import logger
from ..services.auth import (
    verify_password, get_password_hash, create_access_token,
    COOKIE_NAME, get_current_user_from_cookie
)
from ..config import templates
from .. import schemas
from pydantic import ValidationError

router = APIRouter(
    tags=["auth"]
)

@router.get("/register", name="register_page", response_class=HTMLResponse)
async def register_page(request: Request, db: AsyncSession = Depends(get_main_db)) -> Any:
    """Отображает страницу регистрации."""
    user_id = get_current_user_from_cookie(request)
    if user_id:
        user_res = await db.execute(select(models.User).where(models.User.username == user_id))
        user = user_res.scalar_one_or_none()
        if user:
            return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
        else:
            response = templates.TemplateResponse(request, "register.html", {
                "request": request,
                "error": "Session expired. Please log in again."
            })
            response.delete_cookie(COOKIE_NAME)
            return response
    return templates.TemplateResponse(request, "register.html", {
        "request": request,
        "error": None
    })

@router.post("/register")
async def register(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    db: AsyncSession = Depends(get_main_db)
) -> Any:
    try:
        schemas.UserCreate(
            username=username,
            password=password,
            confirm_password=confirm_password
        )
    except ValidationError as e:
        error_msgs = [err["msg"] for err in e.errors()]
        return templates.TemplateResponse(
            request, "register.html",
            {"request": request, "error": " | ".join(error_msgs)}
        )

    existing_user_res = await db.execute(select(models.User).where(models.User.username == username))
    existing_user = existing_user_res.scalar_one_or_none()
    if existing_user:
        return templates.TemplateResponse(
            request, "register.html",
            {"request": request, "error": "User with this name already exists"}
        )

    new_user = models.User(
        username=username,
        hashed_password=get_password_hash(password)
    )
    db.add(new_user)
    await db.commit()

    return RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)

@router.get("/login", name="login_page", response_class=HTMLResponse)
async def login_page(request: Request, db: AsyncSession = Depends(get_main_db)) -> Any:
    """Отображает страницу входа."""
    user_id = get_current_user_from_cookie(request)
    if user_id:
        user_res = await db.execute(select(models.User).where(models.User.username == user_id))
        user = user_res.scalar_one_or_none()
        if user:
            return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
        else:
            response = templates.TemplateResponse(request, "login.html", {
                "request": request,
                "error": "Session expired. Please log in again."
            })
            response.delete_cookie(COOKIE_NAME)
            return response
    return templates.TemplateResponse(request, "login.html", {
        "request": request,
        "error": None
    })

@router.post("/login")
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    remember_me: bool = Form(False),
    db: AsyncSession = Depends(get_main_db)
) -> Any:
    """Обрабатывает вход пользователя."""
    user_res = await db.execute(select(models.User).where(models.User.username == username))
    user = user_res.scalar_one_or_none()

    if user and verify_password(password, user.hashed_password):
        token = create_access_token(data={"sub": user.username})
        response = RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
        cookie_kwargs: Dict[str, Any] = {
            "key": COOKIE_NAME,
            "value": token,
            "httponly": True,
            "samesite": "lax"
        }
        if remember_me:
            cookie_kwargs["max_age"] = 2592000 # 30 days

        response.set_cookie(**cookie_kwargs)
        return response

    return templates.TemplateResponse(
        request, "login.html",
        {"request": request, "error": "Invalid username or password"}
    )

@router.get("/logout")
async def logout() -> RedirectResponse:
    """Выход пользователя (удаление cookie)."""
    response = RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
    response.delete_cookie(COOKIE_NAME)
    return response
