from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.delegation import Delegation
from app.schemas import DelegationCreate, DelegationUpdate


def list_delegations(db: Session) -> list[Delegation]:
    return db.scalars(select(Delegation).order_by(Delegation.name)).all()


def get_delegation(db: Session, delegation_id: UUID) -> Delegation:
    delegation = db.get(Delegation, delegation_id)
    if delegation is None:
        raise HTTPException(status_code=404, detail="Delegation not found")
    return delegation


def create_delegation(db: Session, payload: DelegationCreate) -> Delegation:
    delegation = Delegation(
        name=payload.name,
        faculty_advisor_first_name=payload.faculty_advisor_first_name,
        faculty_advisor_last_name=payload.faculty_advisor_last_name,
        faculty_advisor_email=str(payload.faculty_advisor_email),
        head_delegate_id=payload.head_delegate_id,
        contact_role=payload.contact_role,
        school_address=payload.school_address,
        delegation_size=payload.delegation_size,
        attended_before=payload.attended_before,
        payment_process=payload.payment_process,
        policy_ack_registration=payload.policy_ack_registration,
        policy_ack_payment=payload.policy_ack_payment,
        policy_ack_cancellation=payload.policy_ack_cancellation,
        policy_ack_conduct=payload.policy_ack_conduct,
        policy_ack_photography=payload.policy_ack_photography,
        heard_about=payload.heard_about,
        notes=payload.notes,
    )
    db.add(delegation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Delegation name already exists")
    db.refresh(delegation)
    return delegation


def update_delegation(
    db: Session, delegation_id: UUID, payload: DelegationUpdate
) -> Delegation:
    delegation = get_delegation(db, delegation_id)
    updates = payload.model_dump(exclude_none=True)
    if "head_delegate_id" in updates:
        delegation.head_delegate_id = updates.pop("head_delegate_id")
    for field, value in updates.items():
        if field == "faculty_advisor_email":
            delegation.faculty_advisor_email = str(value)
        else:
            setattr(delegation, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Delegation name already exists")
    db.refresh(delegation)
    return delegation


def delete_delegation(db: Session, delegation_id: UUID) -> None:
    delegation = db.get(Delegation, delegation_id)
    if delegation is None:
        return
    try:
        db.delete(delegation)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete delegation")
