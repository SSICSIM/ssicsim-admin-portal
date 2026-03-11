from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.committee import Committee
from app.schemas import CommitteeCreate, CommitteeOut, CommitteeUpdate

router = APIRouter(prefix="/committees", tags=["committees"])


@router.get("", response_model=list[CommitteeOut])
def list_committees(db: Session = Depends(get_db)) -> list[Committee]:
    return list(db.scalars(select(Committee).order_by(Committee.id)))


@router.post("", response_model=CommitteeOut, status_code=201)
def create_committee(payload: CommitteeCreate, db: Session = Depends(get_db)) -> Committee:
    committee = Committee(name=payload.name)
    db.add(committee)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Committee name already exists")
    db.refresh(committee)
    return committee


@router.patch("/{committee_id}", response_model=CommitteeOut)
def update_committee(
    committee_id: int, payload: CommitteeUpdate, db: Session = Depends(get_db)
) -> Committee:
    committee = db.get(Committee, committee_id)
    if committee is None:
        raise HTTPException(status_code=404, detail="Committee not found")
    if payload.name is not None:
        committee.name = payload.name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Committee name already exists")
    db.refresh(committee)
    return committee


@router.delete("/{committee_id}", status_code=204, response_model=None, response_class=Response)
def delete_committee(committee_id: int, db: Session = Depends(get_db)) -> Response:
    committee = db.get(Committee, committee_id)
    if committee is None:
        return Response(status_code=204)
    db.delete(committee)
    db.commit()
    return Response(status_code=204)
