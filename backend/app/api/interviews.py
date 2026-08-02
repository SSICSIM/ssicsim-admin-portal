from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.interview import Interview
from app.schemas import InterviewCreate, InterviewOut, InterviewUpdate
from app.services import interviews

router = APIRouter(prefix="/interviews", tags=["interviews"])


# get all interviews
@router.get("", response_model=list[InterviewOut])
def list_interviews(db: Session = Depends(get_db)) -> list[Interview]:
    return interviews.list_interviews(db)


# create interview
@router.post("", response_model=InterviewOut, status_code=201)
def create_interview(
    payload: InterviewCreate, db: Session = Depends(get_db)
) -> Interview:
    return interviews.create_interview(db, payload)


# get interview by applicant
@router.get("/{applicant_id}", response_model=InterviewOut)
def get_interview_by_applicant(
    applicant_id: UUID, db: Session = Depends(get_db)
) -> Interview:
    return interviews.get_interview_by_applicant(db, applicant_id)


# get interview by secretariat id
@router.get("/sec/{sec_id}", response_model=InterviewOut)
def get_interview_by_sec(sec_id: UUID, db: Session = Depends(get_db)) -> Interview:
    return interviews.get_interview_by_sec(db, sec_id)


# update interview
@router.patch("/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: UUID, payload: InterviewUpdate, db: Session = Depends(get_db)
) -> Interview:
    return interviews.update_interview(db, interview_id, payload)


# delete interview
@router.delete(
    "/{applicant_id}", status_code=204, response_model=None, response_class=Response
)
def delete_interview(applicant_id: UUID, db: Session = Depends(get_db)) -> Response:
    interviews.delete_interview(db, applicant_id)
    return Response(status_code=204)
