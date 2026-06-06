from fastapi import APIRouter
from .pages import router as pages_router
from .api import router as api_router

router = APIRouter(tags=["words"])
router.include_router(pages_router)
router.include_router(api_router)
