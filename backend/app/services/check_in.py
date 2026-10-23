from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import TypeVar
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.delegate import Delegate
from app.models.delegation import Delegation
from app.models.enums import DelegateStatus, EventType
from app.models.sec_member import SecMember
from app.services.event_logs import record_event
from app.services.events import delegate_name

# Conference check-in at the registration desk, done by the secretariat.
# Each check-in and undo goes in the activity log as a Check In entry, which
# the check-in page shows as its log.

Row = TypeVar("Row", Delegate, Delegation)


def _update(
    db: Session,
    model: type[Row],
    row_id: UUID,
    actor: SecMember | None,
    change: Callable[[Row], str | None],
) -> Row:
    """Locks the row (so two desks can't both check in and log the same
    person), applies `change`, and logs the message it returns, if any."""
    row = db.get(model, row_id, with_for_update=True)
    if row is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    details = change(row)
    if details:
        record_event(
            db, actor, EventType.CHECK_IN, model.__name__, str(row.id), details
        )
    db.commit()
    db.refresh(row)
    return row


def _undo(row: Delegate | Delegation, name: str) -> str | None:
    if row.checked_in_at is None:
        return None
    row.checked_in_at = None
    return f"Undid check-in of {name}"


def check_in_delegate(
    db: Session, delegate_id: UUID, actor: SecMember | None = None
) -> Delegate:
    def change(delegate: Delegate) -> str | None:
        if delegate.delegate_status == DelegateStatus.WAITLIST:
            raise HTTPException(
                status_code=409,
                detail="This delegate is on the waitlist. Change their status first.",
            )
        if delegate.checked_in_at is not None:
            return None
        delegate.checked_in_at = datetime.now(UTC)
        return f"Checked in {delegate_name(delegate)}"

    return _update(db, Delegate, delegate_id, actor, change)


def undo_delegate_check_in(
    db: Session, delegate_id: UUID, actor: SecMember | None = None
) -> Delegate:
    return _update(
        db, Delegate, delegate_id, actor, lambda d: _undo(d, delegate_name(d))
    )


def check_in_delegation(
    db: Session, delegation_id: UUID, actor: SecMember | None = None
) -> Delegation:
    """Checks in the delegation itself: its faculty advisor or head delegate
    has arrived. Its delegates are checked in separately, one by one, and a
    head delegate counts as one of them, so they need both check-ins."""

    def change(delegation: Delegation) -> str | None:
        if delegation.checked_in_at is not None:
            return None
        delegation.checked_in_at = datetime.now(UTC)
        return f"Checked in {delegation.name} (faculty advisor/head delegate)"

    return _update(db, Delegation, delegation_id, actor, change)


def undo_delegation_check_in(
    db: Session, delegation_id: UUID, actor: SecMember | None = None
) -> Delegation:
    """Undoes the delegation's own check-in. Its delegates aren't affected."""
    return _update(db, Delegation, delegation_id, actor, lambda d: _undo(d, d.name))
