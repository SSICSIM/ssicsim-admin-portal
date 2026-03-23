from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.delegation import Delegation
from app.schemas import DelegationCreate, DelegationOut, DelegationUpdate

router = APIRouter(prefix="/delegations", tags=["delegations"])


@router.get("", response_model=list[DelegationOut])
def list_delegations(db: Session = Depends(get_db)) -> list[Delegation]:
    return list(db.scalars(select(Delegation).order_by(Delegation.name)))


@router.post("", response_model=DelegationOut, status_code=201)
def create_delegation(payload: DelegationCreate, db: Session = Depends(get_db)) -> Delegation:
    delegation = Delegation(
        name=payload.name,
        faculty_advisor_first_name=payload.faculty_advisor_first_name,
        faculty_advisor_last_name=payload.faculty_advisor_last_name,
        faculty_advisor_email=str(payload.faculty_advisor_email)
        if payload.faculty_advisor_email
        else None,
        head_delegate_id=payload.head_delegate_id,
    )
    db.add(delegation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Delegation name already exists")
    db.refresh(delegation)
    return delegation


@router.get("/{delegation_id}", response_model=DelegationOut)
def get_delegation(delegation_id: UUID, db: Session = Depends(get_db)) -> Delegation:
    delegation = db.get(Delegation, delegation_id)
    if delegation is None:
        raise HTTPException(status_code=404, detail="Delegation not found")
    return delegation


@router.patch("/{delegation_id}", response_model=DelegationOut)
def update_delegation(
    delegation_id: UUID, payload: DelegationUpdate, db: Session = Depends(get_db)
) -> Delegation:
    delegation = db.get(Delegation, delegation_id)
    if delegation is None:
        raise HTTPException(status_code=404, detail="Delegation not found")
    if payload.name is not None:
        delegation.name = payload.name
    if payload.faculty_advisor_first_name is not None:
        delegation.faculty_advisor_first_name = payload.faculty_advisor_first_name
    if payload.faculty_advisor_last_name is not None:
        delegation.faculty_advisor_last_name = payload.faculty_advisor_last_name
    if payload.faculty_advisor_email is not None:
        delegation.faculty_advisor_email = str(payload.faculty_advisor_email)
    if payload.head_delegate_id is not None:
        delegation.head_delegate_id = payload.head_delegate_id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Delegation name already exists")
    db.refresh(delegation)
    return delegation


@router.delete("/{delegation_id}", status_code=204, response_model=None, response_class=Response)
def delete_delegation(delegation_id: UUID, db: Session = Depends(get_db)) -> Response:
    delegation = db.get(Delegation, delegation_id)
    if delegation is None:
        return Response(status_code=204)
    db.delete(delegation)
    db.commit()
    return Response(status_code=204)
