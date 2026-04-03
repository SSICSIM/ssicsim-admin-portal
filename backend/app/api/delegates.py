from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.delegate import Delegate
from app.schemas import DelegateCreate, DelegateOut, DelegateUpdate
from app.services import delegates

router = APIRouter(prefix="/delegates", tags=["delegates"])


@router.get("", response_model=list[DelegateOut])
def list_delegates(db: Session = Depends(get_db)) -> list[Delegate]:
    return delegates.list_delegates(db)


@router.post("", response_model=DelegateOut, status_code=201)
def create_delegate(payload: DelegateCreate, db: Session = Depends(get_db)) -> Delegate:
    return delegates.create_delegate(db, payload)


@router.get("/{delegate_id}", response_model=DelegateOut)
def get_delegate(delegate_id: UUID, db: Session = Depends(get_db)) -> Delegate:
    return delegates.get_delegate(db, delegate_id)


@router.patch("/{delegate_id}", response_model=DelegateOut)
def update_delegate(
    delegate_id: UUID, payload: DelegateUpdate, db: Session = Depends(get_db)
) -> Delegate:
    return delegates.update_delegate(db, delegate_id, payload)


@router.delete("/{delegate_id}", status_code=204, response_model=None, response_class=Response)
def delete_delegate(delegate_id: UUID, db: Session = Depends(get_db)) -> Response:
    delegates.delete_delegate(db, delegate_id)
    return Response(status_code=204)
