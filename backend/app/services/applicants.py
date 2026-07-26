from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.applicant import Applicant
from app.models.enums import EventType
from app.schemas import ApplicantCreate, ApplicantUpdate
from app.services.event_logs import record_event


def list_applicants(db : Session) -> list[Applicant]:
    return db.scalars(
            select(Applicant).order_by(Applicant.last_name, Applicant.first_name)
        ).all()

def get_applicant(db, applicant_id):
    applicant = db.get(Applicant, applicant_id)
    if applicant is None:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return applicant


def create_applicant(db: Session, payload: ApplicantCreate) -> Applicant:
    applicant = Applicant(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=str(payload.email),
        roles_of_interest=payload.roles_of_interest,
        first_committee=payload.first_committee,
        second_committee=payload.second_committee,
        third_committee=payload.third_committee,
        applicant_status=payload.applicant_status,
        availability=payload.availability
    )

    db.add(applicant)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Applicant email already exists")
    db.refresh(applicant)
    return applicant


def update_applicant(db: Session, applicant_id: UUID, payload: ApplicantUpdate) -> Applicant:
    applicant = get_applicant(db, applicant_id)
    updates = payload.model_dump(exclude_none=True)

    old_status = applicant.applicant_status
    new_status = updates.get("applicant_status")

    for field, value in updates.items():
        if field == "email":
            applicant.email = str(value)
        else:
            setattr(applicant, field, value)

    if new_status is not None and new_status != old_status:
        record_event(
            db,
            EventType.STATUS_CHANGE,
            "Applicant",
            str(applicant.id),
            f"{applicant.first_name} {applicant.last_name}: {old_status.value} → {new_status.value}"
        )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Applicant email already exists")
    db.refresh(applicant)
    return applicant


def delete_applicant(db: Session, applicant_id: UUID) -> None:
    applicant = db.get(Applicant, applicant_id)
    if applicant is None:
        return

    try:
        db.delete(applicant)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete applicant")

