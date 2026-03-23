from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.character import Character
from app.models.delegate import Delegate
from app.schemas import (
    AssignmentBulkCreate,
    AssignmentCreate,
    AssignmentOut,
    AssignmentUpdate,
    assignment_from_character,
)

router = APIRouter(prefix="/assignments", tags=["assignments"])


def _delegate_has_assignment(db: Session, delegate_id: UUID) -> bool:
    return db.scalar(select(Character).where(Character.delegate_id == delegate_id)) is not None


@router.post("", response_model=AssignmentOut, status_code=201)
def assign_delegate(payload: AssignmentCreate, db: Session = Depends(get_db)) -> AssignmentOut:
    character = db.get(Character, payload.character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    if db.get(Delegate, payload.delegate_id) is None:
        raise HTTPException(status_code=404, detail="Delegate not found")
    if character.delegate_id is not None:
        raise HTTPException(status_code=409, detail="Character already assigned")
    if _delegate_has_assignment(db, payload.delegate_id):
        raise HTTPException(status_code=409, detail="Delegate already assigned")
    character.delegate_id = payload.delegate_id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assignment conflict")
    db.refresh(character)
    return assignment_from_character(character)


@router.post("/bulk", response_model=list[AssignmentOut], status_code=201)
def bulk_assign(payload: AssignmentBulkCreate, db: Session = Depends(get_db)) -> list[AssignmentOut]:
    results: list[AssignmentOut] = []
    to_assign: list[tuple[Character, UUID]] = []
    seen_delegates: set[UUID] = set()
    seen_characters: set[UUID] = set()

    for assignment in payload.assignments:
        if assignment.delegate_id in seen_delegates:
            raise HTTPException(status_code=409, detail="Duplicate delegate in bulk request")
        if assignment.character_id in seen_characters:
            raise HTTPException(status_code=409, detail="Duplicate character in bulk request")
        seen_delegates.add(assignment.delegate_id)
        seen_characters.add(assignment.character_id)

        character = db.get(Character, assignment.character_id)
        if character is None:
            raise HTTPException(status_code=404, detail="Character not found")
        if db.get(Delegate, assignment.delegate_id) is None:
            raise HTTPException(status_code=404, detail="Delegate not found")
        if character.delegate_id is not None:
            raise HTTPException(status_code=409, detail="Character already assigned")
        if _delegate_has_assignment(db, assignment.delegate_id):
            raise HTTPException(status_code=409, detail="Delegate already assigned")
        to_assign.append((character, assignment.delegate_id))

    for character, delegate_id in to_assign:
        character.delegate_id = delegate_id
        results.append(assignment_from_character(character))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assignment conflict")
    return results


@router.patch("/{delegate_id}", response_model=AssignmentOut)
def update_assignment(
    delegate_id: UUID, payload: AssignmentUpdate, db: Session = Depends(get_db)
) -> AssignmentOut:
    current = db.scalar(select(Character).where(Character.delegate_id == delegate_id))
    if current is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    next_character = db.get(Character, payload.character_id)
    if next_character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    if next_character.delegate_id is not None:
        raise HTTPException(status_code=409, detail="Character already assigned")
    current.delegate_id = None
    next_character.delegate_id = delegate_id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assignment conflict")
    db.refresh(next_character)
    return assignment_from_character(next_character)


@router.delete("/{delegate_id}", status_code=204, response_model=None, response_class=Response)
def delete_assignment(delegate_id: UUID, db: Session = Depends(get_db)) -> Response:
    current = db.scalar(select(Character).where(Character.delegate_id == delegate_id))
    if current is None:
        return Response(status_code=204)
    current.delegate_id = None
    db.commit()
    return Response(status_code=204)
