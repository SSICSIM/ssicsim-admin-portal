from __future__ import annotations

import logging
import re
import unicodedata
from collections import Counter
from datetime import UTC, datetime
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from pydantic import BaseModel, ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.delegate import Delegate
from app.models.enums import DelegateStatus, EventRegistrationStatus, EventType
from app.models.event import Event, EventCharacter, EventRegistration
from app.models.sec_member import SecMember
from app.schemas import (
    CheckInOut,
    DelegateSocialAnswers,
    DelegateTrainingAnswers,
    EventCharacterCreate,
    EventCheckInRequest,
    EventCheckInResult,
    EventOut,
    EventRegisterRequest,
    EventRegisterResult,
    EventRegistrationCreate,
    EventRegistrationUpdate,
    EventSessionOut,
    EventUpdate,
    MidnightCrisisAnswers,
)
from app.services.delegates import assume_utc_if_naive
from app.services.event_logs import record_event

logger = logging.getLogger(__name__)

MIDNIGHT_CRISIS = "midnight-crisis"
DELEGATE_SOCIAL = "delegate-social"
DELEGATE_TRAINING = "delegate-training"

ANSWER_SCHEMAS: dict[str, type[BaseModel]] = {
    MIDNIGHT_CRISIS: MidnightCrisisAnswers,
    DELEGATE_SOCIAL: DelegateSocialAnswers,
    DELEGATE_TRAINING: DelegateTrainingAnswers,
}

# Delegate Training runs as two in-person sessions, each capped at the event's
# capacity.
TRAINING_SESSIONS: list[tuple[str, str]] = [
    ("session_1", "Session 1 (12:00 – 1:00 PM)"),
    ("session_2", "Session 2 (2:00 – 3:00 PM)"),
]
_SESSION_LABELS = dict(TRAINING_SESSIONS)

# Check-in closes when the event (or training session) ends. Times match the
# public event schedule, in conference-local time.
CONFERENCE_TZ = ZoneInfo("America/Toronto")
SESSION_ENDS: dict[str, datetime] = {
    "session_1": datetime(2026, 10, 23, 13, 0, tzinfo=CONFERENCE_TZ),
    "session_2": datetime(2026, 10, 23, 15, 0, tzinfo=CONFERENCE_TZ),
}
EVENT_ENDS: dict[str, datetime] = {
    DELEGATE_TRAINING: SESSION_ENDS["session_2"],
    MIDNIGHT_CRISIS: datetime(2026, 10, 23, 23, 0, tzinfo=CONFERENCE_TZ),
    DELEGATE_SOCIAL: datetime(2026, 10, 24, 22, 0, tzinfo=CONFERENCE_TZ),
}


def _now() -> datetime:
    return datetime.now(UTC)


def _closed(event: Event, ends: datetime) -> HTTPException:
    closed_at = ends.astimezone(CONFERENCE_TZ).strftime("%I:%M %p").lstrip("0")
    return _error(
        403,
        "check_in_closed",
        f"Check-in for {event.name} closed at {closed_at}. Please see an organizer.",
    )


# Shown in the "you're off the waitlist" email. Training's time comes from
# the delegate's session.
EVENT_DETAILS: dict[str, dict[str, str]] = {
    DELEGATE_SOCIAL: {
        "date": "Saturday, October 24, 2026",
        "time": "7:00 – 10:00 PM",
        "location": "Victoria College, Alumni Hall",
    },
    DELEGATE_TRAINING: {
        "date": "Friday, October 23, 2026",
        "location": "UC 179, University College (15 King's College Cir)",
    },
}

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


def _error(status_code: int, code: str, message: str, **extra: Any) -> HTTPException:
    return HTTPException(
        status_code=status_code, detail={"code": code, "message": message, **extra}
    )


def delegate_name(delegate: Delegate) -> str:
    return delegate.full_name or f"{delegate.first_name} {delegate.last_name}"


# ─── events ───────────────────────────────────────────────────────────────────


def get_event(db: Session, slug: str) -> Event:
    event = db.scalar(select(Event).where(Event.slug == slug))
    if event is None:
        raise _error(404, "event_not_found", "This event doesn't exist.")
    return event


def _delegate_by_email(db: Session, email: str) -> Delegate | None:
    return db.scalar(select(Delegate).where(func.lower(Delegate.email) == email))


def _registration_for(
    db: Session, event: Event, delegate: Delegate, *, lock: bool = False
) -> EventRegistration | None:
    query = select(EventRegistration).where(
        EventRegistration.event_id == event.id,
        EventRegistration.delegate_id == delegate.id,
    )
    if lock:
        query = query.with_for_update(of=EventRegistration)
    return db.scalar(query)


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
                capacity=event.capacity,
                filled=filled_by_session[key],
            )
            for key, label in TRAINING_SESSIONS
        ]

    return EventOut(
        id=event.id,
        slug=event.slug,
        name=event.name,
        capacity=event.capacity,
        registration_open=event.registration_open,
        registration_deadline=event.registration_deadline,
        has_characters=event.has_characters,
        selective=event.slug in SELECTIVE_EVENTS,
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
    if _normalize(delegate.full_name) and _normalize(delegate.full_name) == _normalize(
        f"{first_name} {last_name}"
    ):
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
        deadline and datetime.now(UTC) > assume_utc_if_naive(deadline)
    ):
        db.rollback()
        raise _error(
            403,
            "registration_closed",
            f"Registration for {event.name} is closed. Contact registration@ssicsim.ca if you have questions.",
        )

    email = str(payload.email).strip().lower()
    delegate = _delegate_by_email(db, email)
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

    existing = _registration_for(db, event, delegate)
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
        full = (
            event.capacity is not None
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
        f"{delegate_name(delegate)} signed up for {event.name} ({status.value})",
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


# ─── waitlist emails ──────────────────────────────────────────────────────────


def _enqueue_email(recipients: list[dict[str, str]], subject: str, body: str) -> bool:
    """Queue an email on the same worker queue as the emailer. Returns False
    (and logs) instead of raising, so a mail problem never undoes a status
    change that was already saved."""
    if not settings.gmail_user or not settings.gmail_app_password:
        logger.warning("Email not sent: GMAIL_USER / GMAIL_APP_PASSWORD not set")
        return False
    try:
        from app.jobs.email import enqueue_send_emails

        enqueue_send_emails(recipients, subject, body)
        return True
    except Exception:
        logger.exception("Failed to queue email")
        return False


def _off_waitlist_email(
    event: Event, registration: EventRegistration
) -> tuple[str, str]:
    delegate = registration.delegate
    # "Alex (they/them)" -> "Alex" for the greeting.
    preferred = re.sub(r"\(.*?\)", "", delegate.preferred_name or "").strip()
    name = preferred or delegate.first_name
    details = EVENT_DETAILS.get(event.slug, {})
    session = _SESSION_LABELS.get(registration.answers.get("session", ""))
    lines = [f"**Event:** {event.name}"]
    if details.get("date"):
        lines.append(f"**Date:** {details['date']}")
    if session or details.get("time"):
        lines.append(f"**Time:** {session or details['time']}")
    if details.get("location"):
        lines.append(f"**Location:** {details['location']}")
    subject = f"You're Off the Waitlist: SSICSIM 2026 {event.name}"
    body = (
        f"Dear {name},\n\n"
        f"Good news! A spot has opened up for {event.name} at SSICSIM 2026, so you "
        "have been moved off the waitlist and your spot is now confirmed.\n\n"
        + "\n".join(lines)
        + "\n\nIf you can no longer attend, please let us know as soon as possible "
        "at [registration@ssicsim.ca](mailto:registration@ssicsim.ca) so we can "
        "offer your spot to another delegate.\n\n"
        "Sincerely,\nThe SSICSIM Secretariat"
    )
    return subject, body


# ─── day-of check-in ──────────────────────────────────────────────────────────

CHECK_IN_STATUSES = (
    EventRegistrationStatus.REGISTERED,
    EventRegistrationStatus.ACCEPTED,
)


def check_in(
    db: Session, slug: str, payload: EventCheckInRequest
) -> EventCheckInResult:
    """Public check-in from the QR form: the email and name must match a
    delegate holding a spot (Registered/Accepted) for this event. Checking in
    twice is fine and returns the original time."""
    event = get_event(db, slug)
    email = str(payload.email).strip().lower()
    delegate = _delegate_by_email(db, email)
    if delegate is None or not name_matches(
        delegate, payload.first_name, payload.last_name
    ):
        raise _error(
            422,
            "not_found",
            "We couldn't find a delegate with that name and email. Use the name "
            "and email you registered with, or see the registration desk.",
        )

    # Locked so a double tap can't check in (and log) twice.
    registration = _registration_for(db, event, delegate, lock=True)
    if (
        registration is None
        and event.slug not in SELECTIVE_EVENTS
        and delegate.delegate_status != DelegateStatus.WAITLIST
    ):
        return _walk_in(db, event, delegate, payload)
    if registration is None or registration.status not in CHECK_IN_STATUSES:
        status = registration.status.value if registration else "not signed up"
        raise _error(
            403,
            "not_attending",
            f"You don't have a confirmed spot for {event.name} ({status}). Please see an organizer.",
        )

    already = registration.checked_in_at is not None
    # Someone already checked in can still pull up their green screen.
    ends = SESSION_ENDS.get(registration.answers.get("session")) or EVENT_ENDS.get(
        event.slug
    )
    if not already and ends and _now() >= ends:
        raise _closed(event, ends)
    if not already:
        registration.checked_in_at = datetime.now(UTC)
        record_event(
            db,
            None,
            EventType.EVENT_REGISTRATION,
            "event_registration",
            str(registration.id),
            f"{delegate_name(delegate)} checked in to {event.name}",
        )
        db.commit()

    return _check_in_result(event, registration, already)


def _check_in_result(
    event: Event, registration: EventRegistration, already: bool
) -> EventCheckInResult:
    return EventCheckInResult(
        event_slug=event.slug,
        event_name=event.name,
        delegate_name=delegate_name(registration.delegate),
        checked_in_at=registration.checked_in_at,
        already_checked_in=already,
        walk_in=registration.walk_in,
    )


def _walk_in(
    db: Session, event: Event, delegate: Delegate, payload: EventCheckInRequest
) -> EventCheckInResult:
    """A conference delegate who never signed up for this event. If it has
    space, offer to add them; once they confirm (walk_in=True, plus the
    session they picked for Delegate Training), register and check them in
    together."""
    # Only a confirmed walk-in takes a spot, so only it locks the event row
    # (two can't both take the last spot); the offer itself doesn't.
    if payload.walk_in:
        db.refresh(event, with_for_update=True)

    def has_space(session: str | None = None) -> bool:
        return (
            event.capacity is None or _filled_count(db, event, session) < event.capacity
        )

    ends = EVENT_ENDS.get(event.slug)
    if ends and _now() >= ends:
        db.rollback()
        raise _closed(event, ends)

    # Training walk-ins pick a session; ones that have ended or are full are
    # listed but greyed out.
    if event.slug == DELEGATE_TRAINING:
        sessions = []
        for key, label in TRAINING_SESSIONS:
            unavailable = None
            if _now() >= SESSION_ENDS[key]:
                unavailable = "Ended"
            elif not has_space(key):
                unavailable = "Full"
            sessions.append({"key": key, "label": label, "unavailable": unavailable})
        open_sessions = [s for s in sessions if not s["unavailable"]]
        space = bool(open_sessions)
        next_step = (
            "Pick the session you're attending and we'll add you and check you in."
        )
    else:
        sessions = open_sessions = []
        space = has_space()
        next_step = "We can add you and check you in now."
    if not space:
        db.rollback()
        raise _error(
            403,
            "event_full",
            f"You aren't signed up for {event.name}, and it's full. Please see an organizer.",
        )

    session = payload.session if open_sessions else None
    if not payload.walk_in or (
        open_sessions and session not in {s["key"] for s in open_sessions}
    ):
        db.rollback()
        raise _error(
            409,
            "walk_in_available",
            f"You aren't signed up for {event.name}, but there's still space. {next_step}",
            sessions=sessions,
        )

    registration = EventRegistration(
        event_id=event.id,
        delegate_id=delegate.id,
        status=EventRegistrationStatus.REGISTERED,
        submitted_first_name=payload.first_name.strip(),
        submitted_last_name=payload.last_name.strip(),
        answers={"session": session} if session else {},
        checked_in_at=datetime.now(UTC),
        walk_in=True,
    )
    db.add(registration)
    try:
        db.flush()
        record_event(
            db,
            None,
            EventType.EVENT_REGISTRATION,
            "event_registration",
            str(registration.id),
            f"{delegate_name(delegate)} walked in and checked in to {event.name}",
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        # A double tap already added them: check in that registration instead.
        if _registration_for(db, event, delegate) is None:
            raise
        return check_in(db, event.slug, payload)

    return _check_in_result(event, registration, already=False)


def list_check_ins(db: Session) -> list[CheckInOut]:
    rows = db.execute(
        select(EventRegistration, Event)
        .join(Event, Event.id == EventRegistration.event_id)
        .where(EventRegistration.checked_in_at.is_not(None))
        .order_by(EventRegistration.checked_in_at.desc())
    ).unique()
    return [
        CheckInOut(
            registration_id=registration.id,
            event_slug=event.slug,
            event_name=event.name,
            delegate_name=delegate_name(registration.delegate),
            delegate_email=registration.delegate.email,
            checked_in_at=registration.checked_in_at,
            walk_in=registration.walk_in,
        )
        for registration, event in rows
    ]


def undo_check_in(
    db: Session, slug: str, registration_id: UUID, actor: SecMember | None = None
) -> None:
    event = get_event(db, slug)
    registration = _get_registration(db, event, registration_id)
    # A walk-in only signed up by checking in, so undoing it removes the
    # registration too and frees the spot.
    if registration.walk_in:
        db.delete(registration)
        action = "Removed walk-in"
    else:
        registration.checked_in_at = None
        action = "Undid check-in of"
    record_event(
        db,
        actor,
        EventType.EVENT_REGISTRATION,
        "event_registration",
        str(registration.id),
        f"{action} {delegate_name(registration.delegate)} for {event.name}",
    )
    db.commit()


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


def _get_registration(
    db: Session, event: Event, registration_id: UUID
) -> EventRegistration:
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
        f"{delegate_name(delegate)} added to {event.name} ({status.value})",
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
    # Social/Training: someone moved up from the waitlist is emailed that
    # their spot is confirmed (Midnight Crisis has no waitlist).
    off_waitlist = (
        registration.status == EventRegistrationStatus.WAITLIST
        and payload.status in FILLED_STATUSES
    )
    if payload.status is not None and payload.status != registration.status:
        _check_status(event, payload.status)
        record_event(
            db,
            actor,
            EventType.EVENT_REGISTRATION,
            "Delegate",
            str(registration.delegate_id),
            f"{delegate_name(registration.delegate)} {event.name} status: "
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
    if off_waitlist:
        subject, body = _off_waitlist_email(event, registration)
        delegate = registration.delegate
        _enqueue_email(
            [{"email": delegate.email, "name": delegate.first_name}], subject, body
        )
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
        f"{delegate_name(registration.delegate)} removed from {event.name}",
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
        f"{delegate_name(registration.delegate)} assigned to {character.name} ({event.name})",
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
            f"{delegate_name(character.registration.delegate)} unassigned from {character.name} ({event.name})",
        )
    character.registration_id = None
    db.commit()
    db.refresh(character)
    return character
