from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.character import Character
from app.models.committee import Committee
from app.models.delegate import Delegate
from app.models.delegation import Delegation
from app.models.enums import DelegateStatus, EventType, RegistrationPeriod
from app.models.sec_member import SecMember
from app.schemas import DelegateBulkEditRequest, DelegateCreate, DelegateUpdate
from app.services.event_logs import record_event


def _assume_utc_if_naive(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def _compute_registration_period(applied_at: datetime) -> RegistrationPeriod:
    applied_at = _assume_utc_if_naive(applied_at)
    early_bird_deadline = settings.registration_early_bird_deadline
    regular_deadline = settings.registration_regular_deadline

    if early_bird_deadline and applied_at <= _assume_utc_if_naive(early_bird_deadline):
        return RegistrationPeriod.EARLY_BIRD
    if regular_deadline and applied_at <= _assume_utc_if_naive(regular_deadline):
        return RegistrationPeriod.REGULAR
    if regular_deadline:
        return RegistrationPeriod.LATE
    return RegistrationPeriod.REGULAR


def list_delegates(db: Session) -> list[Delegate]:
    return db.scalars(
        select(Delegate).order_by(Delegate.last_name, Delegate.first_name)
    ).all()


def get_delegate(db: Session, delegate_id: UUID) -> Delegate:
    delegate = db.get(Delegate, delegate_id)
    if delegate is None:
        raise HTTPException(status_code=404, detail="Delegate not found")
    return delegate


def _validate_delegation(db: Session, delegation_id: UUID | None) -> None:
    if delegation_id is None:
        return
    if db.get(Delegation, delegation_id) is None:
        raise HTTPException(status_code=404, detail="Delegation not found")


def create_delegate(db: Session, payload: DelegateCreate) -> Delegate:
    _validate_delegation(db, payload.delegation_id)
    applied_at = payload.date_applied or datetime.now(UTC)
    delegate = Delegate(
        first_name=payload.first_name,
        last_name=payload.last_name,
        full_name=payload.full_name,
        preferred_name=payload.preferred_name,
        grade=payload.grade,
        email=str(payload.email),
        phone=payload.phone,
        delegate_experience=payload.delegate_experience,
        first_committee=payload.first_committee,
        second_committee=payload.second_committee,
        third_committee=payload.third_committee,
        committee_selection_ack=payload.committee_selection_ack,
        date_applied=applied_at,
        registration_period=_compute_registration_period(applied_at),
        delegate_status=payload.delegate_status,
        delegation_id=payload.delegation_id,
        code_of_conduct_url=payload.code_of_conduct_url,
        code_of_conduct_signed=payload.code_of_conduct_signed,
        payment_policy_ack=payload.payment_policy_ack,
        cancellation_policy_ack=payload.cancellation_policy_ack,
        financial_aid_status=payload.financial_aid_status,
        financial_aid_reason=payload.financial_aid_reason,
        financial_aid_contacted=payload.financial_aid_contacted,
        payment_receipt_url=payload.payment_receipt_url,
        heard_about=payload.heard_about,
        notes=payload.notes,
    )
    db.add(delegate)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Delegate email already exists")
    db.refresh(delegate)
    return delegate


def update_delegate(
    db: Session,
    delegate_id: UUID,
    payload: DelegateUpdate,
    actor: SecMember | None = None,
) -> Delegate:
    delegate = get_delegate(db, delegate_id)
    updates = payload.model_dump(exclude_none=True)
    if "delegation_id" in updates:
        _validate_delegation(db, updates["delegation_id"])
        delegate.delegation_id = updates.pop("delegation_id")

    old_status = delegate.delegate_status
    new_status = updates.get("delegate_status")

    for field, value in updates.items():
        if field == "email":
            delegate.email = str(value)
        else:
            setattr(delegate, field, value)

    if new_status is not None and new_status != old_status:
        record_event(
            db,
            actor,
            EventType.STATUS_CHANGE,
            "Delegate",
            str(delegate.id),
            f"{delegate.first_name} {delegate.last_name}: {old_status.value} → {new_status.value}",
        )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Delegate email already exists")
    db.refresh(delegate)
    return delegate


def bulk_edit_delegates(
    db: Session,
    payload: DelegateBulkEditRequest,
    actor: SecMember | None = None,
) -> tuple[list[Delegate], list[str], UUID | None]:
    warnings: list[str] = []
    changed: list[Delegate] = []
    change_log: list[tuple[EventType, str, str]] = []
    seen_characters: set[UUID] = set()

    for item in payload.items:
        delegate = db.get(Delegate, item.delegate_id)
        if delegate is None:
            warnings.append(f"Delegate not found: delegate_id={item.delegate_id}")
            continue

        # Captured once, before any mutation below, so the STATUS_CHANGE log
        # always records the delegate's true prior status — not a status an
        # earlier step in this same item already overwrote.
        original_status = delegate.delegate_status

        is_confirmed = original_status == DelegateStatus.CONFIRMED
        wants_change = item.delegate_status is not None or item.character_id is not None
        if is_confirmed and not item.unassign and wants_change:
            warnings.append(
                f"{delegate.first_name} {delegate.last_name} is Confirmed — unassign before editing"
            )
            continue

        item_changed = False
        # A requested character change that fails (not found / already taken /
        # duplicate in batch) must block any requested status change too —
        # otherwise a delegate can end up e.g. "Confirmed" with no character.
        character_requested = item.character_id is not None
        character_step_ok = True

        if item.unassign:
            current = db.scalar(
                select(Character).where(Character.delegate_id == delegate.id)
            )
            if current is not None:
                current.delegate_id = None
                delegate.delegate_status = DelegateStatus.AWAITING_ASSIGNMENT
                change_log.append(
                    (
                        EventType.UNASSIGNMENT,
                        str(delegate.id),
                        f"{delegate.first_name} {delegate.last_name} unassigned from {current.name}",
                    )
                )
                item_changed = True

        if item.character_id is not None:
            if item.character_id in seen_characters:
                warnings.append(
                    f"Duplicate character in batch: character_id={item.character_id}"
                )
                character_step_ok = False
            else:
                character = db.get(Character, item.character_id)
                if character is None:
                    warnings.append(
                        f"Character not found: character_id={item.character_id}"
                    )
                    character_step_ok = False
                elif (
                    character.delegate_id is not None
                    and character.delegate_id != delegate.id
                ):
                    warnings.append(
                        f"Character already assigned: character_id={item.character_id}"
                    )
                    character_step_ok = False
                else:
                    seen_characters.add(item.character_id)
                    existing = db.scalar(
                        select(Character).where(Character.delegate_id == delegate.id)
                    )
                    if existing is not None and existing.id != character.id:
                        existing.delegate_id = None
                        # Flush the NULL before assigning the new character —
                        # delegate_id is unique, and without an explicit flush
                        # here SQLAlchemy doesn't guarantee this UPDATE lands
                        # before the one below, which can transiently violate
                        # that constraint (same fix as update_assignment in
                        # services/assignments.py).
                        db.flush()
                        change_log.append(
                            (
                                EventType.UNASSIGNMENT,
                                str(delegate.id),
                                f"{delegate.first_name} {delegate.last_name} unassigned from "
                                f"{existing.name}",
                            )
                        )
                    character.delegate_id = delegate.id
                    delegate.delegate_status = DelegateStatus.ASSIGNED
                    committee = db.get(Committee, character.committee_id)
                    committee_name = (
                        committee.name if committee else "Unknown committee"
                    )
                    change_log.append(
                        (
                            EventType.ASSIGNMENT,
                            str(delegate.id),
                            f"{delegate.first_name} {delegate.last_name} assigned to "
                            f"{character.name} ({committee_name})",
                        )
                    )
                    item_changed = True

        if (
            item.delegate_status is not None
            and item.delegate_status != original_status
            and (not character_requested or character_step_ok)
        ):
            delegate.delegate_status = item.delegate_status
            change_log.append(
                (
                    EventType.STATUS_CHANGE,
                    str(delegate.id),
                    f"{delegate.first_name} {delegate.last_name}: "
                    f"{original_status.value} → {item.delegate_status.value}",
                )
            )
            item_changed = True
        elif (
            item.delegate_status is not None
            and character_requested
            and not character_step_ok
        ):
            warnings.append(
                f"{delegate.first_name} {delegate.last_name}: status change skipped because "
                "the character assignment in this row failed"
            )

        if item_changed:
            changed.append(delegate)

    if not changed:
        return [], warnings, None

    batch_id = uuid4()
    actor_name = f"{actor.first_name} {actor.last_name}" if actor else "Someone"
    count = len(changed)
    record_event(
        db,
        actor,
        EventType.BATCH_EDIT,
        "Batch",
        str(batch_id),
        f"{actor_name} changed {count} delegate{'s' if count != 1 else ''}",
        batch_id=batch_id,
    )
    for event_type, target_id, details in change_log:
        record_event(
            db, actor, event_type, "Delegate", target_id, details, batch_id=batch_id
        )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Bulk edit conflict")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to apply bulk edit")

    for delegate in changed:
        db.refresh(delegate)

    return changed, warnings, batch_id


def delete_delegate(db: Session, delegate_id: UUID) -> None:
    delegate = db.get(Delegate, delegate_id)
    if delegate is None:
        return
    try:
        db.delete(delegate)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete delegate")
