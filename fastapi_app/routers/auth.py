from fastapi import APIRouter, Depends, Request, Form, status, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import re

from .. import models
from ..database import get_db
from ..logger import logger
from ..services.auth import (
    verify_password, get_password_hash, create_access_token,
    COOKIE_NAME, get_current_user_from_cookie
)
from ..config import templates

router = APIRouter(
    tags=["auth"]
)

@router.get("/register", name="register_page")
async def register_page(request: Request):
    try:
        user = get_current_user_from_cookie(request)
        if user:
            return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
        return templates.TemplateResponse("register.html", {
            "request": request,
            "error": None
        })
    except Exception as e:
        logger.error(f"Error rendering register page: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/register")
async def register(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        errors = []
        if len(username) < 3 or len(username) > 20:
            errors.append("Логин должен быть от 3 до 20 символов")
        if not re.match(r"^\w+$", username):
            errors.append("Логин может содержать только буквы, цифры и подчеркивание")
        if len(password) < 8:
            errors.append("Пароль должен быть не менее 8 символов")
        if password != confirm_password:
            errors.append("Пароли не совпадают")

        if errors:
            return templates.TemplateResponse(
                "register.html",
                {"request": request, "error": " | ".join(errors)}
            )

        existing_user_res = await db.execute(select(models.User).where(models.User.username == username))
        existing_user = existing_user_res.scalar_one_or_none()
        if existing_user:
            return templates.TemplateResponse(
                "register.html",
                {"request": request, "error": "Пользователь с таким именем уже существует"}
            )

        new_user = models.User(
            username=username,
            hashed_password=get_password_hash(password)
        )
        db.add(new_user)
        await db.commit()

        return RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in register: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Registration failed")

@router.get("/login", name="login_page")
async def login_page(request: Request):
    try:
        user = get_current_user_from_cookie(request)
        if user:
            return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": None
        })
    except Exception as e:
        logger.error(f"Error rendering login page: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/login")
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    remember_me: bool = Form(False),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_res = await db.execute(select(models.User).where(models.User.username == username))
        user = user_res.scalar_one_or_none()

        if user and verify_password(password, user.hashed_password):
            token = create_access_token(data={"sub": user.username})
            response = RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
            cookie_kwargs = {
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
            "login.html",
            {"request": request, "error": "Неверный логин или пароль"}
        )
    except Exception as e:
        logger.error(f"Error in login: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Login failed")

@router.get("/logout")
async def logout():
    response = RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
    response.delete_cookie(COOKIE_NAME)
    return response
