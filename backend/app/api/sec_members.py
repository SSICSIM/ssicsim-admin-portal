from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sec_member import SecMember
from app.schemas import SecMemberCreate, SecMemberOut, SecMemberUpdate
from app.services import sec_members

router = APIRouter(prefix="/sec-members", tags=["sec-members"])


@router.get("", response_model=list[SecMemberOut])
def list_sec_members(db: Session = Depends(get_db)) -> list[SecMember]:
    return sec_members.list_sec_members(db)


@router.post("", response_model=SecMemberOut, status_code=201)
def create_sec_member(payload: SecMemberCreate, db: Session = Depends(get_db)) -> SecMember:
    return sec_members.create_sec_member(db, payload)


@router.get("/{sec_member_id}", response_model=SecMemberOut)
def get_sec_member(sec_member_id: UUID, db: Session = Depends(get_db)) -> SecMember:
    return sec_members.get_sec_member(db, sec_member_id)


@router.patch("/{sec_member_id}", response_model=SecMemberOut)
def update_sec_member(sec_member_id: UUID, payload: SecMemberUpdate, db: Session = Depends(get_db)) -> SecMember:
    return sec_members.update_sec_member(db, sec_member_id, payload)


@router.delete("/{sec_member_id}", status_code=204, response_model=None, response_class=Response)
def delete_sec_member(sec_member_id: UUID, db: Session = Depends(get_db)) -> Response:
    sec_members.delete_sec_member(db, sec_member_id)
    return Response(status_code=204)
