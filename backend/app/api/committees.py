from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi import UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.committee import Committee
from app.schemas import CommitteeCreate, CommitteeOut, CommitteeUpdate
from app.utilities.storage import upload_file_to_bucket
from app.services import committees

router = APIRouter(prefix="/committees", tags=["committees"])


@router.get("", response_model=list[CommitteeOut])
def list_committees(db: Session = Depends(get_db)) -> list[Committee]:
    return committees.list_committees(db)


@router.get("/{committee_id}", response_model=CommitteeOut)
def get_committee(committee_id: UUID, db: Session = Depends(get_db)) -> Committee:
    return committees.get_committee(db, committee_id)


@router.post("", response_model=CommitteeOut, status_code=201)
def create_committee(payload: CommitteeCreate, db: Session = Depends(get_db)) -> Committee:
    return committees.create_committee(db, payload)


@router.patch("/{committee_id}", response_model=CommitteeOut)
def update_committee(
    committee_id: UUID, payload: CommitteeUpdate, db: Session = Depends(get_db)
) -> Committee:
    return committees.update_committee(db, committee_id, payload)


@router.delete("/{committee_id}", status_code=204, response_model=None, response_class=Response)
def delete_committee(committee_id: UUID, db: Session = Depends(get_db)) -> Response:
    committees.delete_committee(db, committee_id)
    return Response(status_code=204)


@router.post("/{committee_id}/image", response_model=CommitteeOut)
def upload_committee_image(
    committee_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Committee:
    # TODO: migrate to S3-backed storage in production instead of local/supabase bucket.
    committee = db.get(Committee, committee_id)
    if committee is None:
        raise HTTPException(status_code=404, detail="Committee not found")
    if file.content_type is None or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed")

    image_url = upload_file_to_bucket(
        file.file,
        content_type=file.content_type,
        key_prefix=f"committees/{committee_id}/",
        filename=file.filename,
    )
    committee.image_url = image_url
    db.commit()
    db.refresh(committee)
    return committee
