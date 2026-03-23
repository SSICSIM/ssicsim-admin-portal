from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sec_member import SecMember
from app.schemas import SecMemberCreate, SecMemberOut, SecMemberUpdate

router = APIRouter(prefix="/sec-members", tags=["sec-members"])


@router.get("", response_model=list[SecMemberOut])
def list_sec_members(db: Session = Depends(get_db)) -> list[SecMember]:
    return list(db.scalars(select(SecMember).order_by(SecMember.last_name)))


@router.post("", response_model=SecMemberOut, status_code=201)
def create_sec_member(payload: SecMemberCreate, db: Session = Depends(get_db)) -> SecMember:
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


@router.get("/{sec_member_id}", response_model=SecMemberOut)
def get_sec_member(sec_member_id: UUID, db: Session = Depends(get_db)) -> SecMember:
    sec_member = db.get(SecMember, sec_member_id)
    if sec_member is None:
        raise HTTPException(status_code=404, detail="Sec member not found")
    return sec_member


@router.patch("/{sec_member_id}", response_model=SecMemberOut)
def update_sec_member(
    sec_member_id: UUID, payload: SecMemberUpdate, db: Session = Depends(get_db)
) -> SecMember:
    sec_member = db.get(SecMember, sec_member_id)
    if sec_member is None:
        raise HTTPException(status_code=404, detail="Sec member not found")
    if payload.first_name is not None:
        sec_member.first_name = payload.first_name
    if payload.last_name is not None:
        sec_member.last_name = payload.last_name
    if payload.email is not None:
        sec_member.email = str(payload.email)
    if payload.role is not None:
        sec_member.role = payload.role
    if payload.last_logged_in is not None:
        sec_member.last_logged_in = payload.last_logged_in
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Sec member email already exists")
    db.refresh(sec_member)
    return sec_member


@router.delete("/{sec_member_id}", status_code=204, response_model=None, response_class=Response)
def delete_sec_member(sec_member_id: UUID, db: Session = Depends(get_db)) -> Response:
    sec_member = db.get(SecMember, sec_member_id)
    if sec_member is None:
        return Response(status_code=204)
    db.delete(sec_member)
    db.commit()
    return Response(status_code=204)
