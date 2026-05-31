from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.character import Character
from app.models.delegate import Delegate
from app.models.enums import DelegateStatus
from app.schemas import AssignmentBulkCreate, AssignmentCreate, AssignmentOut, AssignmentUpdate
from app.utilities.assignments import assignment_from_character, build_bulk_assignments, validate_assignment


def assign_delegate(db: Session, payload: AssignmentCreate) -> AssignmentOut:
    character, delegate = validate_assignment(db, character_id=payload.character_id, delegate_id=payload.delegate_id)

    character.delegate_id = payload.delegate_id
    delegate.delegate_status = DelegateStatus.ASSIGNED

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assignment conflict")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to assign delegate")
    db.refresh(character)
    return assignment_from_character(character)


def bulk_assign(db: Session, payload: AssignmentBulkCreate) -> tuple[list[AssignmentOut], list[str]]:
    results: list[AssignmentOut] = []
    assignment_pairs = [(item.character_id, item.delegate_id) for item in payload.assignments]
    to_assign, warnings = build_bulk_assignments(db, assignment_pairs)

    for character, delegate_id in to_assign:
        character.delegate_id = delegate_id
        delegate = db.get(Delegate, delegate_id)
        if delegate is not None:
            delegate.delegate_status = DelegateStatus.ASSIGNED
        results.append(assignment_from_character(character))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assignment conflict")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to assign delegates")
    return results, warnings


def update_assignment(db: Session, delegate_id: UUID, payload: AssignmentUpdate) -> AssignmentOut:
    current = db.scalar(select(Character).where(Character.delegate_id == delegate_id))
    if current is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    next_character = db.get(Character, payload.character_id)
    if next_character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    if next_character.delegate_id is not None:
        raise HTTPException(status_code=409, detail="Character already assigned")
    current.delegate_id = None
    db.flush()
    next_character.delegate_id = delegate_id
    delegate = db.get(Delegate, delegate_id)
    if delegate is not None:
        delegate.delegate_status = DelegateStatus.ASSIGNED
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assignment conflict")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to update assignment")
    db.refresh(next_character)
    return assignment_from_character(next_character)


def delete_assignment(db: Session, delegate_id: UUID) -> None:
    current = db.scalar(select(Character).where(Character.delegate_id == delegate_id))
    if current is None:
        return
    current.delegate_id = None
    delegate = db.get(Delegate, delegate_id)
    if delegate is not None:
        delegate.delegate_status = DelegateStatus.AWAITING_ASSIGNMENT
    db.commit()
