from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.sec_member import SecMember
from app.schemas import SecMemberCreate, SecMemberUpdate


def list_sec_members(db: Session) -> list[SecMember]:
    return db.scalars(select(SecMember).order_by(SecMember.last_name)).all()


def get_sec_member(db: Session, sec_member_id: UUID) -> SecMember:
    sec_member = db.get(SecMember, sec_member_id)
    if sec_member is None:
        raise HTTPException(status_code=404, detail="Sec member not found")
    return sec_member


def create_sec_member(db: Session, payload: SecMemberCreate) -> SecMember:
    sec_member = SecMember(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=str(payload.email),
        role=payload.role,
        last_logged_in=payload.last_logged_in,
    )
    db.add(sec_member)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Sec member email already exists")
    db.refresh(sec_member)
    return sec_member


def update_sec_member(
    db: Session, sec_member_id: UUID, payload: SecMemberUpdate
) -> SecMember:
    sec_member = get_sec_member(db, sec_member_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "email":
            sec_member.email = str(value)
        else:
            setattr(sec_member, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Sec member email already exists")
    db.refresh(sec_member)
    return sec_member


def delete_sec_member(db: Session, sec_member_id: UUID) -> None:
    sec_member = db.get(SecMember, sec_member_id)
    if sec_member is None:
        return
    try:
        db.delete(sec_member)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete sec member")
