from fastapi import APIRouter, Depends
from ..services.auth import check_auth_dependency

router = APIRouter(
    tags=["admin"],
    dependencies=[Depends(check_auth_dependency)]
)
