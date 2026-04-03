from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.committee import Committee
from app.schemas import CommitteeCreate, CommitteeUpdate


def list_committees(db: Session) -> list[Committee]:
    return db.scalars(select(Committee).order_by(Committee.id)).all()


def get_committee(db: Session, committee_id: UUID) -> Committee:
    committee = db.get(Committee, committee_id)
    if committee is None:
        raise HTTPException(status_code=404, detail="Committee not found")
    return committee


def create_committee(db: Session, payload: CommitteeCreate) -> Committee:
    committee = Committee(**payload.model_dump())
    db.add(committee)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Committee name already exists")
    db.refresh(committee)
    return committee


def update_committee(db: Session, committee_id: UUID, payload: CommitteeUpdate) -> Committee:
    committee = get_committee(db, committee_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(committee, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Committee name already exists")
    db.refresh(committee)
    return committee


def delete_committee(db: Session, committee_id: UUID) -> None:
    committee = db.get(Committee, committee_id)
    if committee is None:
        return
    try:
        db.delete(committee)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete committee")
