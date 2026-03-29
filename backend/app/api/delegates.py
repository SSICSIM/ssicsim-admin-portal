from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.delegate import Delegate
from app.schemas import DelegateCreate, DelegateOut, DelegateUpdate

router = APIRouter(prefix="/delegates", tags=["delegates"])


@router.get("", response_model=list[DelegateOut])
def list_delegates(db: Session = Depends(get_db)) -> list[Delegate]:
    return list(
        db.scalars(select(Delegate).order_by(Delegate.last_name, Delegate.first_name))
    )


@router.post("", response_model=DelegateOut, status_code=201)
def create_delegate(payload: DelegateCreate, db: Session = Depends(get_db)) -> Delegate:
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


@router.get("/{delegate_id}", response_model=DelegateOut)
def get_delegate(delegate_id: UUID, db: Session = Depends(get_db)) -> Delegate:
    delegate = db.get(Delegate, delegate_id)
    if delegate is None:
        raise HTTPException(status_code=404, detail="Delegate not found")
    return delegate


@router.patch("/{delegate_id}", response_model=DelegateOut)
def update_delegate(
    delegate_id: UUID, payload: DelegateUpdate, db: Session = Depends(get_db)
) -> Delegate:
    delegate = db.get(Delegate, delegate_id)
    if delegate is None:
        raise HTTPException(status_code=404, detail="Delegate not found")
    if payload.first_name is not None:
        delegate.first_name = payload.first_name
    if payload.last_name is not None:
        delegate.last_name = payload.last_name
    if payload.full_name is not None:
        delegate.full_name = payload.full_name
    if payload.preferred_name is not None:
        delegate.preferred_name = payload.preferred_name
    if payload.grade is not None:
        delegate.grade = payload.grade
    if payload.email is not None:
        delegate.email = str(payload.email)
    if payload.delegate_experience is not None:
        delegate.delegate_experience = payload.delegate_experience
    if payload.first_committee is not None:
        delegate.first_committee = payload.first_committee
    if payload.second_committee is not None:
        delegate.second_committee = payload.second_committee
    if payload.third_committee is not None:
        delegate.third_committee = payload.third_committee
    if payload.date_applied is not None:
        delegate.date_applied = payload.date_applied
    if payload.delegate_status is not None:
        delegate.delegate_status = payload.delegate_status
    if payload.delegation_id is not None:
        delegate.delegation_id = payload.delegation_id
    if payload.code_of_conduct_url is not None:
        delegate.code_of_conduct_url = payload.code_of_conduct_url
    if payload.payment_policy_ack is not None:
        delegate.payment_policy_ack = payload.payment_policy_ack
    if payload.cancellation_policy_ack is not None:
        delegate.cancellation_policy_ack = payload.cancellation_policy_ack
    if payload.heard_about is not None:
        delegate.heard_about = payload.heard_about
    if payload.notes is not None:
        delegate.notes = payload.notes
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Delegate email already exists")
    db.refresh(delegate)
    return delegate


@router.delete("/{delegate_id}", status_code=204, response_model=None, response_class=Response)
def delete_delegate(delegate_id: UUID, db: Session = Depends(get_db)) -> Response:
    delegate = db.get(Delegate, delegate_id)
    if delegate is None:
        return Response(status_code=204)
    db.delete(delegate)
    db.commit()
    return Response(status_code=204)
