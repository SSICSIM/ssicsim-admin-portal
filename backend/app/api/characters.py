from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.character import Character
from app.schemas import CharacterCreate, CharacterOut, CharacterUpdate
from app.services import characters

router = APIRouter(prefix="/characters", tags=["characters"])


@router.get("", response_model=list[CharacterOut])
def list_characters(db: Session = Depends(get_db)) -> list[Character]:
    return characters.list_characters(db)


@router.post("", response_model=CharacterOut, status_code=201)
def create_character(payload: CharacterCreate, db: Session = Depends(get_db)) -> Character:
    return characters.create_character(db, payload)


@router.get("/{character_id}", response_model=CharacterOut)
def get_character(character_id: UUID, db: Session = Depends(get_db)) -> Character:
    return characters.get_character(db, character_id)


@router.patch("/{character_id}", response_model=CharacterOut)
def update_character(character_id: UUID, payload: CharacterUpdate, db: Session = Depends(get_db)) -> Character:
    return characters.update_character(db, character_id, payload)


@router.delete("/{character_id}", status_code=204, response_model=None, response_class=Response)
def delete_character(character_id: UUID, db: Session = Depends(get_db)) -> Response:
    characters.delete_character(db, character_id)
    return Response(status_code=204)
