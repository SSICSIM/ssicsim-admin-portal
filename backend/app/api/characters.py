from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.character import Character
from app.schemas import CharacterCreate, CharacterOut, CharacterUpdate

router = APIRouter(prefix="/characters", tags=["characters"])


@router.get("", response_model=list[CharacterOut])
def list_characters(db: Session = Depends(get_db)) -> list[Character]:
    return list(db.scalars(select(Character).order_by(Character.id)))


@router.post("", response_model=CharacterOut, status_code=201)
def create_character(payload: CharacterCreate, db: Session = Depends(get_db)) -> Character:
    character = Character(
        committee_id=payload.committee_id,
        delegate_id=payload.delegate_id,
    )
    db.add(character)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Character already assigned")
    db.refresh(character)
    return character


@router.get("/{character_id}", response_model=CharacterOut)
def get_character(character_id: UUID, db: Session = Depends(get_db)) -> Character:
    character = db.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


@router.patch("/{character_id}", response_model=CharacterOut)
def update_character(
    character_id: UUID, payload: CharacterUpdate, db: Session = Depends(get_db)
) -> Character:
    character = db.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    if payload.committee_id is not None:
        character.committee_id = payload.committee_id
    if payload.delegate_id is not None:
        character.delegate_id = payload.delegate_id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Character already assigned")
    db.refresh(character)
    return character


@router.delete("/{character_id}", status_code=204, response_model=None, response_class=Response)
def delete_character(character_id: UUID, db: Session = Depends(get_db)) -> Response:
    character = db.get(Character, character_id)
    if character is None:
        return Response(status_code=204)
    db.delete(character)
    db.commit()
    return Response(status_code=204)
