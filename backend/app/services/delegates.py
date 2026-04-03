from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.delegate import Delegate
from app.models.delegation import Delegation
from app.schemas import DelegateCreate, DelegateUpdate


def list_delegates(db: Session) -> list[Delegate]:
    return db.scalars(select(Delegate).order_by(Delegate.last_name, Delegate.first_name)).all()


def get_delegate(db: Session, delegate_id: UUID) -> Delegate:
    delegate = db.get(Delegate, delegate_id)
    if delegate is None:
        raise HTTPException(status_code=404, detail="Delegate not found")
    return delegate


def _validate_delegation(db: Session, delegation_id: UUID | None) -> None:
    if delegation_id is None:
        return
    if db.get(Delegation, delegation_id) is None:
        raise HTTPException(status_code=404, detail="Delegation not found")


def create_delegate(db: Session, payload: DelegateCreate) -> Delegate:
    _validate_delegation(db, payload.delegation_id)
    delegate = Delegate(
        first_name=payload.first_name,
        last_name=payload.last_name,
        full_name=payload.full_name,
        preferred_name=payload.preferred_name,
        grade=payload.grade,
        email=str(payload.email),
        delegate_experience=payload.delegate_experience,
        first_committee=payload.first_committee,
        second_committee=payload.second_committee,
        third_committee=payload.third_committee,
        date_applied=payload.date_applied,
        delegate_status=payload.delegate_status,
        delegation_id=payload.delegation_id,
        code_of_conduct_url=payload.code_of_conduct_url,
        payment_policy_ack=payload.payment_policy_ack,
        cancellation_policy_ack=payload.cancellation_policy_ack,
        heard_about=payload.heard_about,
        notes=payload.notes,
    )
    db.add(delegate)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Delegate email already exists")
    db.refresh(delegate)
    return delegate


def update_delegate(db: Session, delegate_id: UUID, payload: DelegateUpdate) -> Delegate:
    delegate = get_delegate(db, delegate_id)
    updates = payload.model_dump(exclude_none=True)
    if "delegation_id" in updates:
        _validate_delegation(db, updates["delegation_id"])
        delegate.delegation_id = updates.pop("delegation_id")
    for field, value in updates.items():
        if field == "email":
            delegate.email = str(value)
        else:
            setattr(delegate, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Delegate email already exists")
    db.refresh(delegate)
    return delegate


def delete_delegate(db: Session, delegate_id: UUID) -> None:
    delegate = db.get(Delegate, delegate_id)
    if delegate is None:
        return
    try:
        db.delete(delegate)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete delegate")
