from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import EventType
from app.models.event_log import EventLog
from app.models.sec_member import SecMember
from app.schemas import EventLogCreate, EventLogUpdate


def list_event_logs(db: Session) -> list[EventLog]:
    return db.scalars(select(EventLog).order_by(EventLog.timestamp.desc())).all()


def record_event(
    db: Session,
    actor: SecMember | None,
    event_type: EventType,
    target_type: str,
    target_id: str,
    details: str,
) -> None:
    # Adds to the session without committing — the caller's existing commit
    # persists this alongside the state change it describes, atomically.
    db.add(
        EventLog(
            sec_member_id=actor.id if actor else None,
            event_type=event_type,
            target_type=target_type,
            target_id=target_id,
            details=details,
        )
    )


def _validate_sec_member(db: Session, sec_member_id: UUID | None) -> None:
    if sec_member_id is None:
        return
    if db.get(SecMember, sec_member_id) is None:
        raise HTTPException(status_code=404, detail="Sec member not found")


def create_event_log(db: Session, payload: EventLogCreate) -> EventLog:
    _validate_sec_member(db, payload.sec_member_id)
    event_log = EventLog(
        sec_member_id=payload.sec_member_id,
        event_type=payload.event_type,
        target_type=payload.target_type,
        target_id=payload.target_id,
        details=payload.details,
    )
    if payload.timestamp is not None:
        event_log.timestamp = payload.timestamp
    db.add(event_log)
    db.commit()
    db.refresh(event_log)
    return event_log


def get_event_log(db: Session, log_id: UUID) -> EventLog:
    event_log = db.get(EventLog, log_id)
    if event_log is None:
        raise HTTPException(status_code=404, detail="Event log not found")
    return event_log


def update_event_log(db: Session, log_id: UUID, payload: EventLogUpdate) -> EventLog:
    event_log = get_event_log(db, log_id)
    updates = payload.model_dump(exclude_none=True)
    if "sec_member_id" in updates:
        _validate_sec_member(db, updates["sec_member_id"])
        event_log.sec_member_id = updates.pop("sec_member_id")
    for field, value in updates.items():
        setattr(event_log, field, value)
    db.commit()
    db.refresh(event_log)
    return event_log


def delete_event_log(db: Session, log_id: UUID) -> None:
    event_log = db.get(EventLog, log_id)
    if event_log is None:
        return
    try:
        db.delete(event_log)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete event log")
