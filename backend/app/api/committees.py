from __future__ import annotations

from uuid import UUID

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


@router.get("/{committee_id}", response_model=CommitteeOut)
def get_committee(committee_id: UUID, db: Session = Depends(get_db)) -> Committee:
    committee = db.get(Committee, committee_id)
    if committee is None:
        raise HTTPException(status_code=404, detail="Committee not found")
    return committee


@router.post("", response_model=CommitteeOut, status_code=201)
def create_committee(payload: CommitteeCreate, db: Session = Depends(get_db)) -> Committee:
    committee = Committee(
        name=payload.name,
        small_description=payload.small_description,
        large_description=payload.large_description,
        director_name=payload.director_name,
        chair_name=payload.chair_name,
        crisis_analysts=payload.crisis_analysts,
        max_delegates=payload.max_delegates,
        background_guide_link=payload.background_guide_link,
        mechanics_guide_link=payload.mechanics_guide_link,
        character_guide_link=payload.character_guide_link,
    )
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
    committee_id: UUID, payload: CommitteeUpdate, db: Session = Depends(get_db)
) -> Committee:
    committee = db.get(Committee, committee_id)
    if committee is None:
        raise HTTPException(status_code=404, detail="Committee not found")
    if payload.name is not None:
        committee.name = payload.name
    if payload.small_description is not None:
        committee.small_description = payload.small_description
    if payload.large_description is not None:
        committee.large_description = payload.large_description
    if payload.director_name is not None:
        committee.director_name = payload.director_name
    if payload.chair_name is not None:
        committee.chair_name = payload.chair_name
    if payload.crisis_analysts is not None:
        committee.crisis_analysts = payload.crisis_analysts
    if payload.max_delegates is not None:
        committee.max_delegates = payload.max_delegates
    if payload.background_guide_link is not None:
        committee.background_guide_link = payload.background_guide_link
    if payload.mechanics_guide_link is not None:
        committee.mechanics_guide_link = payload.mechanics_guide_link
    if payload.character_guide_link is not None:
        committee.character_guide_link = payload.character_guide_link
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Committee name already exists")
    db.refresh(committee)
    return committee


@router.delete("/{committee_id}", status_code=204, response_model=None, response_class=Response)
def delete_committee(committee_id: UUID, db: Session = Depends(get_db)) -> Response:
    committee = db.get(Committee, committee_id)
    if committee is None:
        return Response(status_code=204)
    db.delete(committee)
    db.commit()
    return Response(status_code=204)
