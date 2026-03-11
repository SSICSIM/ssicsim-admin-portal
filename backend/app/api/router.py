from __future__ import annotations

from fastapi import APIRouter

from app.api.committees import router as committees_router
from app.api.health import router as health_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(committees_router)

