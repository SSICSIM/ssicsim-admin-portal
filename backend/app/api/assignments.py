from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.auth import get_current_actor
from app.database import get_db
from app.models.sec_member import SecMember
from app.schemas import (
    AssignmentBulkCreate,
    AssignmentCreate,
    AssignmentOut,
    AssignmentUpdate,
)
from app.services import assignments

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.post("", response_model=AssignmentOut, status_code=201)
def assign_delegate(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> AssignmentOut:
    return assignments.assign_delegate(db, payload, actor)


@router.post("/bulk", response_model=list[AssignmentOut], status_code=201)
def bulk_assign(
    payload: AssignmentBulkCreate,
    response: Response,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> list[AssignmentOut]:
    results, warnings = assignments.bulk_assign(db, payload, actor)
    if response is not None and warnings:
        response.headers["X-Assignment-Warnings"] = " | ".join(warnings)
    return results


@router.patch("/{delegate_id}", response_model=AssignmentOut)
def update_assignment(
    delegate_id: UUID,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> AssignmentOut:
    return assignments.update_assignment(db, delegate_id, payload, actor)


@router.delete(
    "/{delegate_id}", status_code=204, response_model=None, response_class=Response
)
def delete_assignment(
    delegate_id: UUID,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> Response:
    assignments.delete_assignment(db, delegate_id, actor)
    return Response(status_code=204)
