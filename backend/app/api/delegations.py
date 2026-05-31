from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.delegation import Delegation
from app.schemas import DelegationCreate, DelegationOut, DelegationUpdate
from app.services import delegations

router = APIRouter(prefix="/delegations", tags=["delegations"])


@router.get("", response_model=list[DelegationOut])
def list_delegations(db: Session = Depends(get_db)) -> list[Delegation]:
    return delegations.list_delegations(db)


@router.post("", response_model=DelegationOut, status_code=201)
def create_delegation(payload: DelegationCreate, db: Session = Depends(get_db)) -> Delegation:
    return delegations.create_delegation(db, payload)


@router.get("/{delegation_id}", response_model=DelegationOut)
def get_delegation(delegation_id: UUID, db: Session = Depends(get_db)) -> Delegation:
    return delegations.get_delegation(db, delegation_id)


@router.patch("/{delegation_id}", response_model=DelegationOut)
def update_delegation(delegation_id: UUID, payload: DelegationUpdate, db: Session = Depends(get_db)) -> Delegation:
    return delegations.update_delegation(db, delegation_id, payload)


@router.delete("/{delegation_id}", status_code=204, response_model=None, response_class=Response)
def delete_delegation(delegation_id: UUID, db: Session = Depends(get_db)) -> Response:
    delegations.delete_delegation(db, delegation_id)
    return Response(status_code=204)
