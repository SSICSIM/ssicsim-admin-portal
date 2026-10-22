from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.auth import get_current_actor
from app.database import get_db
from app.models.event import EventCharacter, EventRegistration
from app.models.sec_member import SecMember
from app.schemas import (
    CheckInOut,
    EventCharacterAssign,
    EventCharacterCreate,
    EventCharacterOut,
    EventCheckInRequest,
    EventCheckInResult,
    EventOut,
    EventRegisterRequest,
    EventRegisterResult,
    EventRegistrationCreate,
    EventRegistrationOut,
    EventRegistrationUpdate,
    EventUpdate,
)
from app.services import events

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db)) -> list[EventOut]:
    return events.list_events(db)


# Declared before /{slug} so "check-ins" isn't read as an event slug.
@router.get("/check-ins", response_model=list[CheckInOut])
def list_check_ins(db: Session = Depends(get_db)) -> list[CheckInOut]:
    return events.list_check_ins(db)


@router.get("/{slug}", response_model=EventOut)
def get_event(slug: str, db: Session = Depends(get_db)) -> EventOut:
    return events.get_event_out(db, slug)


@router.patch("/{slug}", response_model=EventOut)
def update_event(
    slug: str,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> EventOut:
    return events.update_event(db, slug, payload, actor)


# Public sign-up, proxied by the website's /api/events/[slug]/register route.
@router.post("/{slug}/register", response_model=EventRegisterResult, status_code=201)
def register_for_event(
    slug: str, payload: EventRegisterRequest, db: Session = Depends(get_db)
) -> EventRegisterResult:
    return events.register_for_event(db, slug, payload)


# Public day-of check-in, proxied by the check-in site.
@router.post("/{slug}/check-in", response_model=EventCheckInResult)
def check_in(
    slug: str, payload: EventCheckInRequest, db: Session = Depends(get_db)
) -> EventCheckInResult:
    return events.check_in(db, slug, payload)


@router.delete(
    "/{slug}/registrations/{registration_id}/check-in",
    status_code=204,
    response_model=None,
    response_class=Response,
)
def undo_check_in(
    slug: str,
    registration_id: UUID,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> Response:
    events.undo_check_in(db, slug, registration_id, actor)
    return Response(status_code=204)


# ─── registrations ────────────────────────────────────────────────────────────


@router.get("/{slug}/registrations", response_model=list[EventRegistrationOut])
def list_registrations(
    slug: str, db: Session = Depends(get_db)
) -> list[EventRegistration]:
    return events.list_registrations(db, slug)


@router.post(
    "/{slug}/registrations", response_model=EventRegistrationOut, status_code=201
)
def create_registration(
    slug: str,
    payload: EventRegistrationCreate,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> EventRegistration:
    return events.create_registration(db, slug, payload, actor)


@router.patch(
    "/{slug}/registrations/{registration_id}", response_model=EventRegistrationOut
)
def update_registration(
    slug: str,
    registration_id: UUID,
    payload: EventRegistrationUpdate,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> EventRegistration:
    return events.update_registration(db, slug, registration_id, payload, actor)


@router.delete(
    "/{slug}/registrations/{registration_id}",
    status_code=204,
    response_model=None,
    response_class=Response,
)
def delete_registration(
    slug: str,
    registration_id: UUID,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> Response:
    events.delete_registration(db, slug, registration_id, actor)
    return Response(status_code=204)


# ─── characters (Midnight Crisis) ─────────────────────────────────────────────


@router.get("/{slug}/characters", response_model=list[EventCharacterOut])
def list_characters(slug: str, db: Session = Depends(get_db)) -> list[EventCharacter]:
    return events.list_characters(db, slug)


@router.post("/{slug}/characters", response_model=EventCharacterOut, status_code=201)
def create_character(
    slug: str, payload: EventCharacterCreate, db: Session = Depends(get_db)
) -> EventCharacter:
    return events.create_character(db, slug, payload)


@router.delete(
    "/{slug}/characters/{character_id}",
    status_code=204,
    response_model=None,
    response_class=Response,
)
def delete_character(
    slug: str, character_id: UUID, db: Session = Depends(get_db)
) -> Response:
    events.delete_character(db, slug, character_id)
    return Response(status_code=204)


@router.post(
    "/{slug}/characters/{character_id}/assign", response_model=EventCharacterOut
)
def assign_character(
    slug: str,
    character_id: UUID,
    payload: EventCharacterAssign,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> EventCharacter:
    return events.assign_character(
        db, slug, character_id, payload.registration_id, actor
    )


@router.delete(
    "/{slug}/characters/{character_id}/assign", response_model=EventCharacterOut
)
def unassign_character(
    slug: str,
    character_id: UUID,
    db: Session = Depends(get_db),
    actor: SecMember | None = Depends(get_current_actor),
) -> EventCharacter:
    return events.unassign_character(db, slug, character_id, actor)
