from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.interview import Interview
from app.schemas import InterviewCreate, InterviewUpdate


def list_interviews(db: Session) -> list[Interview]:
    return db.scalars(select(Interview).order_by(Interview.interviewDateTime)).all()


def create_interview(db: Session, payload: InterviewCreate) -> Interview:
    interview = Interview(
        applicant_id=payload.applicant_id,
        sec_member_id1=payload.sec_member_id1,
        sec_member_id2=payload.sec_member_id2,
        isConfirmed1=payload.isConfirmed1,
        isConfirmed2=payload.isConfirmed2
    )
    db.add(interview)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Interview for applicant already exists")
    db.refresh(interview)
    return interview


def get_interview_by_applicant(db: Session, applicant_id: UUID) -> Interview:
    interview = db.get(Interview, applicant_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


def get_interview_by_sec(db: Session, sec_id: UUID) -> Interview:
    stmt = select(Interview).where(
        or_(
            Interview.sec_member_id1 == sec_id, 
            Interview.sec_member_id2 == sec_id
        )
    )

    interviews = db.scalars(stmt).all()
    if not interviews:
        raise HTTPException(status_code=404, detail="Interviews not found")
    return interviews


def update_interview(
    db: Session, applicant_id: UUID, payload: InterviewUpdate
) -> Interview:
    interview = get_interview_by_applicant(db, applicant_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(interview, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Interview already exists already exists")
    db.refresh(interview)
    return interview


def delete_interview(db: Session, applicant_id: UUID) -> None:
    interview = db.get(Interview, applicant_id)
    if interview is None:
        return
    try:
        db.delete(interview)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete interview")
