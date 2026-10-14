from __future__ import annotations

import re
import unicodedata
from collections import Counter
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel, ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.delegate import Delegate
from app.models.enums import DelegateStatus, EventRegistrationStatus, EventType
from app.models.event import Event, EventCharacter, EventRegistration
from app.models.sec_member import SecMember
from app.schemas import (
    DelegateSocialAnswers,
    DelegateTrainingAnswers,
    EventCharacterCreate,
    EventCharacterUpdate,
    EventOut,
    EventRegisterRequest,
    EventRegisterResult,
    EventRegistrationCreate,
    EventRegistrationUpdate,
    EventSessionOut,
    EventUpdate,
    MidnightCrisisAnswers,
)
from app.services.event_logs import record_event

MIDNIGHT_CRISIS = "midnight-crisis"
DELEGATE_SOCIAL = "delegate-social"
DELEGATE_TRAINING = "delegate-training"

ANSWER_SCHEMAS: dict[str, type[BaseModel]] = {
    MIDNIGHT_CRISIS: MidnightCrisisAnswers,
    DELEGATE_SOCIAL: DelegateSocialAnswers,
    DELEGATE_TRAINING: DelegateTrainingAnswers,
}

# Delegate Training runs as separate sessions; `limited` sessions are capped
# at the event's capacity each, online is unlimited.
TRAINING_SESSIONS: list[tuple[str, str, bool]] = [
    ("session_1", "Session 1 (12:00 – 1:00 PM, in person)", True),
    ("session_2", "Session 2 (2:00 – 3:00 PM, in person)", True),
    ("online", "Online", False),
]
_SESSION_LABELS = {key: label for key, label, _ in TRAINING_SESSIONS}

# Selective events: every sign-up is an application that waits for SEC to
# accept or reject it, so they have no Registered or Waitlist state.
SELECTIVE_EVENTS = {MIDNIGHT_CRISIS}
SELECTIVE_STATUSES = {
    EventRegistrationStatus.PENDING,
    EventRegistrationStatus.ACCEPTED,
    EventRegistrationStatus.REJECTED,
    EventRegistrationStatus.WITHDRAWN,
}

# Statuses that hold a spot and count toward capacity.
FILLED_STATUSES = (EventRegistrationStatus.REGISTERED, EventRegistrationStatus.ACCEPTED)


def _error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code, detail={"code": code, "message": message}
    )


def _assume_utc_if_naive(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def _delegate_name(delegate: Delegate) -> str:
    return delegate.full_name or f"{delegate.first_name} {delegate.last_name}"


# ─── events ───────────────────────────────────────────────────────────────────


def get_event(db: Session, slug: str) -> Event:
    event = db.scalar(select(Event).where(Event.slug == slug))
    if event is None:
        raise _error(404, "event_not_found", "This event doesn't exist.")
    return event


def _filled_count(db: Session, event: Event, session: str | None = None) -> int:
    query = select(func.count()).where(
        EventRegistration.event_id == event.id,
        EventRegistration.status.in_(FILLED_STATUSES),
    )
    if session is not None:
        query = query.where(EventRegistration.answers["session"].astext == session)
    return db.scalar(query) or 0


def _event_out(db: Session, event: Event) -> EventOut:
    rows = db.execute(
        select(
            EventRegistration.status,
            EventRegistration.answers["session"].astext,
            func.count(),
        )
        .where(EventRegistration.event_id == event.id)
        .group_by(EventRegistration.status, EventRegistration.answers["session"].astext)
    ).all()
    counts: Counter[str] = Counter()
    filled_by_session: Counter[str] = Counter()
    for status, session, n in rows:
        counts[status.value] += n
        if status in FILLED_STATUSES and session:
            filled_by_session[session] += n

    sessions = []
    if event.slug == DELEGATE_TRAINING:
        sessions = [
            EventSessionOut(
                key=key,
                label=label,
                capacity=event.capacity if limited else None,
                filled=filled_by_session[key],
            )
            for key, label, limited in TRAINING_SESSIONS
        ]

    return EventOut(
        id=event.id,
        slug=event.slug,
        name=event.name,
        capacity=event.capacity,
        registration_open=event.registration_open,
        registration_deadline=event.registration_deadline,
        has_characters=event.has_characters,
        counts=dict(counts),
        filled=sum(counts[s.value] for s in FILLED_STATUSES),
        sessions=sessions,
    )


def list_events(db: Session) -> list[EventOut]:
    events = db.scalars(select(Event).order_by(Event.name)).all()
    return [_event_out(db, e) for e in events]


def get_event_out(db: Session, slug: str) -> EventOut:
    return _event_out(db, get_event(db, slug))


def update_event(
    db: Session, slug: str, payload: EventUpdate, actor: SecMember | None = None
) -> EventOut:
    event = get_event(db, slug)
    updates = payload.model_dump(exclude_unset=True)
    if "registration_open" in updates and updates["registration_open"] is None:
        updates.pop("registration_open")
    for field, value in updates.items():
        setattr(event, field, value)
    if updates:
        changes = ", ".join(f"{k}={v}" for k, v in updates.items())
        record_event(
            db,
            actor,
            EventType.EVENT_REGISTRATION,
            "Event",
            str(event.id),
            f"{event.name} updated: {changes}",
        )
    db.commit()
    db.refresh(event)
    return _event_out(db, event)


# ─── public sign-up ───────────────────────────────────────────────────────────


def _normalize(value: str | None) -> str:
    if not value:
        return ""
    # Drop pronouns/notes in parentheses, e.g. "Alex (they/them)".
    value = re.sub(r"\(.*?\)", " ", value)
    value = unicodedata.normalize("NFKD", value)
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = re.sub(r"[^\w\s'-]", " ", value.lower())
    return " ".join(value.split())


def name_matches(delegate: Delegate, first_name: str, last_name: str) -> bool:
    """Cross-check the name typed on an event form against the delegate record.

    The last name must match. The first name may match the registered first
    name, the preferred name, or just the first word of either (so "Mary"
    matches "Mary Jane"). The full typed name matching full_name also passes.
    """
    first, last = _normalize(first_name), _normalize(last_name)
    if not first or not last:
        return False
    if _normalize(delegate.full_name) and _normalize(
        delegate.full_name
    ) == _normalize(f"{first_name} {last_name}"):
        return True
    if last != _normalize(delegate.last_name):
        return False
    candidates: set[str] = set()
    for name in (delegate.first_name, delegate.preferred_name):
        normalized = _normalize(name)
        if normalized:
            candidates.add(normalized)
            candidates.add(normalized.split()[0])
    return first in candidates or first.split()[0] in candidates


def _validate_answers(slug: str, answers: dict[str, Any]) -> dict[str, Any]:
    schema = ANSWER_SCHEMAS.get(slug)
    if schema is None:
        return answers
    try:
        return schema.model_validate(answers).model_dump()
    except ValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first.get("loc", ()))
        message = str(first.get("msg", "Invalid answer")).removeprefix("Value error, ")
        raise _error(
            422,
            "invalid_answers",
            f"{message} ({field})" if field else message,
        ) from exc


def register_for_event(
    db: Session, slug: str, payload: EventRegisterRequest
) -> EventRegisterResult:
    # Lock the event row so concurrent sign-ups can't both take the last spot.
    event = db.scalar(select(Event).where(Event.slug == slug).with_for_update())
    if event is None:
        raise _error(404, "event_not_found", "This event doesn't exist.")

    deadline = event.registration_deadline
    if not event.registration_open or (
        deadline and datetime.now(UTC) > _assume_utc_if_naive(deadline)
    ):
        db.rollback()
        raise _error(
            403,
            "registration_closed",
            f"Registration for {event.name} is closed. Contact registration@ssicsim.ca if you have questions.",
        )

    email = str(payload.email).strip().lower()
    delegate = db.scalar(select(Delegate).where(func.lower(Delegate.email) == email))
    if delegate is None:
        db.rollback()
        raise _error(
            422,
            "not_registered",
            f"We couldn't find a SSICSIM 2026 delegate registered with {email}. "
            "Please use the same email you registered with, or register as a "
            "delegate first at ssicsim.ca/register.",
        )
    if delegate.delegate_status == DelegateStatus.WAITLIST:
        db.rollback()
        raise _error(
            403,
            "waitlisted",
            f"You're currently on the SSICSIM 2026 waitlist, so you can't sign up for "
            f"{event.name} yet. Event registration opens to you once you've been "
            "offered a spot at the conference.",
        )
    if not name_matches(delegate, payload.first_name, payload.last_name):
        db.rollback()
        raise _error(
            422,
            "name_mismatch",
            "The name you entered doesn't match the delegate registered with this "
            "email. Please enter your first and last name as you did on your "
            "delegate registration.",
        )

    existing = db.scalar(
        select(EventRegistration).where(
            EventRegistration.event_id == event.id,
            EventRegistration.delegate_id == delegate.id,
        )
    )
    if existing is not None:
        db.rollback()
        raise _error(
            409,
            "already_registered",
            f"You've already registered for {event.name} "
            f"(status: {existing.status.value}). Contact registration@ssicsim.ca "
            "if you need to change your registration.",
        )

    answers = _validate_answers(slug, payload.answers)

    session = answers.get("session") if slug == DELEGATE_TRAINING else None
    if slug in SELECTIVE_EVENTS:
        status = EventRegistrationStatus.PENDING
    else:
        limited = session != "online"
        full = (
            limited
            and event.capacity is not None
            and _filled_count(db, event, session) >= event.capacity
        )
        status = (
            EventRegistrationStatus.WAITLIST
            if full
            else EventRegistrationStatus.REGISTERED
        )

    registration = EventRegistration(
        event_id=event.id,
        delegate_id=delegate.id,
        status=status,
        submitted_first_name=payload.first_name.strip(),
        submitted_last_name=payload.last_name.strip(),
        answers=answers,
    )
    db.add(registration)
    record_event(
        db,
        None,
        EventType.EVENT_REGISTRATION,
        "Delegate",
        str(delegate.id),
        f"{_delegate_name(delegate)} signed up for {event.name} ({status.value})",
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _error(
            409, "already_registered", f"You've already registered for {event.name}."
        )
    db.refresh(registration)

    return EventRegisterResult(
        id=registration.id,
        status=registration.status,
        event_slug=event.slug,
        event_name=event.name,
        delegate_first_name=delegate.first_name,
        delegate_preferred_name=delegate.preferred_name,
        delegate_email=delegate.email,
        session_label=_SESSION_LABELS.get(session) if session else None,
    )


# ─── admin: registrations ─────────────────────────────────────────────────────


def list_registrations(db: Session, slug: str) -> list[EventRegistration]:
    event = get_event(db, slug)
    return (
        db.scalars(
            select(EventRegistration)
            .where(EventRegistration.event_id == event.id)
            .order_by(EventRegistration.created_at)
        )
        .unique()
        .all()
    )


def _check_status(event: Event, status: EventRegistrationStatus) -> None:
    if event.slug in SELECTIVE_EVENTS and status not in SELECTIVE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"{event.name} applications can only be Pending, Accepted, Rejected, or Withdrawn",
        )


def _get_registration(db: Session, event: Event, registration_id: UUID) -> EventRegistration:
    registration = db.get(EventRegistration, registration_id)
    if registration is None or registration.event_id != event.id:
        raise HTTPException(status_code=404, detail="Registration not found")
    return registration


def create_registration(
    db: Session,
    slug: str,
    payload: EventRegistrationCreate,
    actor: SecMember | None = None,
) -> EventRegistration:
    event = get_event(db, slug)
    delegate = db.get(Delegate, payload.delegate_id)
    if delegate is None:
        raise HTTPException(status_code=404, detail="Delegate not found")
    status = payload.status or (
        EventRegistrationStatus.ACCEPTED
        if slug in SELECTIVE_EVENTS
        else EventRegistrationStatus.REGISTERED
    )
    _check_status(event, status)
    registration = EventRegistration(
        event_id=event.id,
        delegate_id=delegate.id,
        status=status,
        answers=payload.answers,
    )
    db.add(registration)
    record_event(
        db,
        actor,
        EventType.EVENT_REGISTRATION,
        "Delegate",
        str(delegate.id),
        f"{_delegate_name(delegate)} added to {event.name} ({status.value})",
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Delegate is already registered for this event"
        )
    db.refresh(registration)
    return registration


def update_registration(
    db: Session,
    slug: str,
    registration_id: UUID,
    payload: EventRegistrationUpdate,
    actor: SecMember | None = None,
) -> EventRegistration:
    event = get_event(db, slug)
    registration = _get_registration(db, event, registration_id)
    if payload.status is not None and payload.status != registration.status:
        _check_status(event, payload.status)
        record_event(
            db,
            actor,
            EventType.EVENT_REGISTRATION,
            "Delegate",
            str(registration.delegate_id),
            f"{_delegate_name(registration.delegate)} {event.name} status: "
            f"{registration.status.value} → {payload.status.value}",
        )
        registration.status = payload.status
        # Someone no longer attending shouldn't keep an event character.
        if payload.status not in FILLED_STATUSES and registration.character:
            registration.character.registration_id = None
    if payload.answers is not None:
        registration.answers = payload.answers
    db.commit()
    db.refresh(registration)
    return registration


def delete_registration(
    db: Session, slug: str, registration_id: UUID, actor: SecMember | None = None
) -> None:
    event = get_event(db, slug)
    registration = db.get(EventRegistration, registration_id)
    if registration is None or registration.event_id != event.id:
        return
    record_event(
        db,
        actor,
        EventType.EVENT_REGISTRATION,
        "Delegate",
        str(registration.delegate_id),
        f"{_delegate_name(registration.delegate)} removed from {event.name}",
    )
    db.delete(registration)
    db.commit()


# ─── admin: event characters (Midnight Crisis) ────────────────────────────────


def _character_event(db: Session, slug: str) -> Event:
    event = get_event(db, slug)
    if not event.has_characters:
        raise HTTPException(status_code=400, detail="This event has no characters")
    return event


def _get_character(db: Session, event: Event, character_id: UUID) -> EventCharacter:
    character = db.get(EventCharacter, character_id)
    if character is None or character.event_id != event.id:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


def list_characters(db: Session, slug: str) -> list[EventCharacter]:
    event = _character_event(db, slug)
    return db.scalars(
        select(EventCharacter)
        .where(EventCharacter.event_id == event.id)
        .order_by(EventCharacter.name)
    ).all()


def create_character(
    db: Session, slug: str, payload: EventCharacterCreate
) -> EventCharacter:
    event = _character_event(db, slug)
    existing = db.scalar(
        select(EventCharacter).where(
            EventCharacter.event_id == event.id,
            EventCharacter.name == payload.name,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Character conflict")
    character = EventCharacter(
        event_id=event.id,
        name=payload.name,
        priority=payload.priority,
        experience=payload.experience,
    )
    db.add(character)
    db.commit()
    db.refresh(character)
    return character


def update_character(
    db: Session, slug: str, character_id: UUID, payload: EventCharacterUpdate
) -> EventCharacter:
    event = _character_event(db, slug)
    character = _get_character(db, event, character_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(character, field, value)
    db.commit()
    db.refresh(character)
    return character


def delete_character(db: Session, slug: str, character_id: UUID) -> None:
    event = _character_event(db, slug)
    character = db.get(EventCharacter, character_id)
    if character is None or character.event_id != event.id:
        return
    db.delete(character)
    db.commit()


def assign_character(
    db: Session,
    slug: str,
    character_id: UUID,
    registration_id: UUID,
    actor: SecMember | None = None,
) -> EventCharacter:
    event = _character_event(db, slug)
    character = _get_character(db, event, character_id)
    registration = _get_registration(db, event, registration_id)
    if registration.status not in FILLED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Only accepted registrants can be assigned a character",
        )
    if character.registration_id not in (None, registration.id):
        raise HTTPException(status_code=409, detail="Character already assigned")
    # Moving a registrant to a new character frees their previous one.
    if registration.character and registration.character.id != character.id:
        registration.character.registration_id = None
        db.flush()
    character.registration_id = registration.id
    record_event(
        db,
        actor,
        EventType.ASSIGNMENT,
        "Delegate",
        str(registration.delegate_id),
        f"{_delegate_name(registration.delegate)} assigned to {character.name} ({event.name})",
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assignment conflict")
    db.refresh(character)
    return character


def unassign_character(
    db: Session, slug: str, character_id: UUID, actor: SecMember | None = None
) -> EventCharacter:
    event = _character_event(db, slug)
    character = _get_character(db, event, character_id)
    if character.registration is not None:
        record_event(
            db,
            actor,
            EventType.UNASSIGNMENT,
            "Delegate",
            str(character.registration.delegate_id),
            f"{_delegate_name(character.registration.delegate)} unassigned from "
            f"{character.name} ({event.name})",
        )
    character.registration_id = None
    db.commit()
    db.refresh(character)
    return character
