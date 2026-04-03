from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.character import Character
from app.models.committee import Committee
from app.models.delegate import Delegate
from app.schemas import CharacterCreate, CharacterUpdate


def list_characters(db: Session) -> list[Character]:
    return db.scalars(select(Character).order_by(Character.id)).all()


def _validate_fk(db: Session, committee_id: UUID | None, delegate_id: UUID | None) -> None:
    if committee_id is not None:
        if db.get(Committee, committee_id) is None:
            raise HTTPException(status_code=404, detail="Committee not found")
    if delegate_id is not None:
        if db.get(Delegate, delegate_id) is None:
            raise HTTPException(status_code=404, detail="Delegate not found")


def get_character(db: Session, character_id: UUID) -> Character:
    character = db.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


def create_character(db: Session, payload: CharacterCreate) -> Character:
    _validate_fk(db, payload.committee_id, payload.delegate_id)
    # Prevent duplicate character names within a committee (aligns with test expectations).
    existing = db.scalar(
        select(Character).where(
            Character.committee_id == payload.committee_id,
            Character.name == payload.name,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Character conflict")
    character = Character(
        name=payload.name,
        committee_id=payload.committee_id,
        delegate_id=payload.delegate_id,
    )
    db.add(character)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if payload.delegate_id is not None:
            raise HTTPException(status_code=409, detail="Delegate already assigned")
        raise HTTPException(status_code=409, detail="Character conflict")
    db.refresh(character)
    return character


def update_character(db: Session, character_id: UUID, payload: CharacterUpdate) -> Character:
    character = get_character(db, character_id)
    updates = payload.model_dump(exclude_none=True)
    _validate_fk(db, updates.get("committee_id"), updates.get("delegate_id"))
    for field, value in updates.items():
        setattr(character, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if updates.get("delegate_id") is not None:
            raise HTTPException(status_code=409, detail="Delegate already assigned")
        raise HTTPException(status_code=409, detail="Character conflict")
    db.refresh(character)
    return character


def delete_character(db: Session, character_id: UUID) -> None:
    character = db.get(Character, character_id)
    if character is None:
        return
    try:
        db.delete(character)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete character")
