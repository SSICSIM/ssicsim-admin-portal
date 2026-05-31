from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.character import Character
from app.models.delegate import Delegate
from app.schemas import AssignmentOut


def delegate_has_assignment(db: Session, delegate_id: UUID) -> bool:
    return db.scalar(select(Character).where(Character.delegate_id == delegate_id)) is not None


def validate_assignment(db: Session, *, character_id: UUID, delegate_id: UUID) -> tuple[Character, Delegate]:
    character = db.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    delegate = db.get(Delegate, delegate_id)
    if delegate is None:
        raise HTTPException(status_code=404, detail="Delegate not found")
    if character.delegate_id is not None:
        raise HTTPException(status_code=409, detail="Character already assigned")
    if delegate_has_assignment(db, delegate_id):
        raise HTTPException(status_code=409, detail="Delegate already assigned")
    return character, delegate


def build_bulk_assignments(
    db: Session, assignments: list[tuple[UUID, UUID]]
) -> tuple[list[tuple[Character, UUID]], list[str]]:
    to_assign: list[tuple[Character, UUID]] = []
    warnings: list[str] = []
    seen_delegates: set[UUID] = set()
    seen_characters: set[UUID] = set()

    for character_id, delegate_id in assignments:
        # Deduplicate within the incoming payload so we don’t double-assign the same entity in one call.
        if delegate_id in seen_delegates:
            warnings.append(f"Duplicate delegate in bulk request: delegate_id={delegate_id}")
            continue
        if character_id in seen_characters:
            warnings.append(f"Duplicate character in bulk request: character_id={character_id}")
            continue
        seen_delegates.add(delegate_id)
        seen_characters.add(character_id)

        # Validate referenced entities exist before attempting assignment.
        character = db.get(Character, character_id)
        if character is None:
            warnings.append(f"Character not found: character_id={character_id}")
            continue
        if db.get(Delegate, delegate_id) is None:
            warnings.append(f"Delegate not found: delegate_id={delegate_id}")
            continue

        # Respect current assignment state to avoid conflicts.
        if character.delegate_id is not None:
            warnings.append(f"Character already assigned: character_id={character_id}, delegate_id={delegate_id}")
            continue
        if delegate_has_assignment(db, delegate_id):
            warnings.append(f"Delegate already assigned: delegate_id={delegate_id}")
            continue
        to_assign.append((character, delegate_id))

    return to_assign, warnings


def assignment_from_character(character: Any) -> AssignmentOut:
    return AssignmentOut(
        delegate_id=character.delegate_id,
        character_id=character.id,
        committee_id=character.committee_id,
    )
