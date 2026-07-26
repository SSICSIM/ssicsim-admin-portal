from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.auth import get_current_actor
from app.database import get_db
from app.models.applicant import Applicant
from app.schemas import ApplicantCreate, ApplicantOut, ApplicantUpdate
from app.services import applicants

router = APIRouter(prefix="/applicants", tags=["applicants"])

@router.get("", response_model=list[ApplicantOut])
def list_applicant(db: Session = Depends(get_db)) -> list[Applicant]:
    return applicants.list_applicants(db)

@router.post("", response_model=ApplicantOut, status_code=201)
def create_applicant(payload: ApplicantCreate, db: Session = Depends(get_db)) -> Applicant:
    return applicants.create_applicant(db, payload)

@router.get("/{applicant_id}", response_model=ApplicantOut)
def get_applicant(applicant_id: UUID, db: Session = Depends(get_db)) -> Applicant:
    return applicants.get_applicant(db, applicant_id)

@router.patch("/{applicant_id}", response_model=ApplicantOut)
def update_applicant(
    applicant_id: UUID,
    payload: ApplicantUpdate,
    db: Session = Depends(get_db)
) -> Applicant:
    return applicants.update_applicant(db, applicant_id, payload)

@router.delete(
    "/{delegate_id}", status_code=204, response_model=None, response_class=Response
)
def delete_applicant(applicant_id: UUID, db: Session = Depends(get_db)) -> Response:
    applicants.delete_applicant(db, applicant_id)
    return Response(status_code=204)

