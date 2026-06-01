from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.event_log import EventLog
from app.schemas import EventLogCreate, EventLogOut, EventLogUpdate
from app.services import event_logs

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=list[EventLogOut])
def list_event_logs(db: Session = Depends(get_db)) -> list[EventLog]:
    return event_logs.list_event_logs(db)


@router.post("", response_model=EventLogOut, status_code=201)
def create_event_log(
    payload: EventLogCreate, db: Session = Depends(get_db)
) -> EventLog:
    return event_logs.create_event_log(db, payload)


@router.get("/{log_id}", response_model=EventLogOut)
def get_event_log(log_id: UUID, db: Session = Depends(get_db)) -> EventLog:
    return event_logs.get_event_log(db, log_id)


@router.patch("/{log_id}", response_model=EventLogOut)
def update_event_log(
    log_id: UUID, payload: EventLogUpdate, db: Session = Depends(get_db)
) -> EventLog:
    return event_logs.update_event_log(db, log_id, payload)


@router.delete(
    "/{log_id}", status_code=204, response_model=None, response_class=Response
)
def delete_event_log(log_id: UUID, db: Session = Depends(get_db)) -> Response:
    event_logs.delete_event_log(db, log_id)
    return Response(status_code=204)
