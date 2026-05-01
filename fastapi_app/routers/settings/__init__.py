from fastapi import APIRouter
from . import ui_configs, account, database, import_export, db_manager, api

router = APIRouter()

router.include_router(ui_configs.router)
router.include_router(account.router)
router.include_router(database.router)
router.include_router(import_export.router)
router.include_router(db_manager.router)
router.include_router(api.router)
