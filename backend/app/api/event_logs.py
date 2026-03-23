from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.event_log import EventLog
from app.schemas import EventLogCreate, EventLogOut, EventLogUpdate

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=list[EventLogOut])
def list_event_logs(db: Session = Depends(get_db)) -> list[EventLog]:
    return list(db.scalars(select(EventLog).order_by(EventLog.timestamp.desc())))


@router.post("", response_model=EventLogOut, status_code=201)
def create_event_log(payload: EventLogCreate, db: Session = Depends(get_db)) -> EventLog:
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


@router.get("/{log_id}", response_model=EventLogOut)
def get_event_log(log_id: UUID, db: Session = Depends(get_db)) -> EventLog:
    event_log = db.get(EventLog, log_id)
    if event_log is None:
        raise HTTPException(status_code=404, detail="Event log not found")
    return event_log


@router.patch("/{log_id}", response_model=EventLogOut)
def update_event_log(
    log_id: UUID, payload: EventLogUpdate, db: Session = Depends(get_db)
) -> EventLog:
    event_log = db.get(EventLog, log_id)
    if event_log is None:
        raise HTTPException(status_code=404, detail="Event log not found")
    if payload.sec_member_id is not None:
        event_log.sec_member_id = payload.sec_member_id
    if payload.timestamp is not None:
        event_log.timestamp = payload.timestamp
    if payload.event_type is not None:
        event_log.event_type = payload.event_type
    if payload.target_type is not None:
        event_log.target_type = payload.target_type
    if payload.target_id is not None:
        event_log.target_id = payload.target_id
    if payload.details is not None:
        event_log.details = payload.details
    db.commit()
    db.refresh(event_log)
    return event_log


@router.delete("/{log_id}", status_code=204, response_model=None, response_class=Response)
def delete_event_log(log_id: UUID, db: Session = Depends(get_db)) -> Response:
    event_log = db.get(EventLog, log_id)
    if event_log is None:
        return Response(status_code=204)
    db.delete(event_log)
    db.commit()
    return Response(status_code=204)
