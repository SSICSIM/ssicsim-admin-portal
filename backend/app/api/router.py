from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.assignments import router as assignments_router
from app.api.characters import router as characters_router
from app.api.committees import router as committees_router
from app.api.delegates import router as delegates_router
from app.api.delegations import router as delegations_router
from app.api.email import router as email_router
from app.api.email_templates import router as email_templates_router
from app.api.event_logs import router as event_logs_router
from app.api.health import router as health_router
from app.api.sec_members import router as sec_members_router
from app.auth import require_admin_token

# Central API router applies admin token guard once and mounts all sub-routers.

api_router = APIRouter(prefix="/api", dependencies=[Depends(require_admin_token)])
api_router.include_router(health_router)
api_router.include_router(committees_router)
api_router.include_router(delegates_router)
api_router.include_router(delegations_router)
api_router.include_router(characters_router)
api_router.include_router(assignments_router)
api_router.include_router(sec_members_router)
api_router.include_router(email_templates_router)
api_router.include_router(email_router)
api_router.include_router(event_logs_router)
