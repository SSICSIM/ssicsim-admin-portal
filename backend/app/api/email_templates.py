from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.email_template import EmailTemplate
from app.schemas import EmailTemplateCreate, EmailTemplateOut, EmailTemplateUpdate
from app.services import email_templates

router = APIRouter(prefix="/email-templates", tags=["email-templates"])


@router.get("", response_model=list[EmailTemplateOut])
def list_email_templates(db: Session = Depends(get_db)) -> list[EmailTemplate]:
    return email_templates.list_email_templates(db)


@router.post("", response_model=EmailTemplateOut, status_code=201)
def create_email_template(
    payload: EmailTemplateCreate, db: Session = Depends(get_db)
) -> EmailTemplate:
    return email_templates.create_email_template(db, payload)


@router.get("/{template_id}", response_model=EmailTemplateOut)
def get_email_template(
    template_id: UUID, db: Session = Depends(get_db)
) -> EmailTemplate:
    return email_templates.get_email_template(db, template_id)


@router.patch("/{template_id}", response_model=EmailTemplateOut)
def update_email_template(
    template_id: UUID, payload: EmailTemplateUpdate, db: Session = Depends(get_db)
) -> EmailTemplate:
    return email_templates.update_email_template(db, template_id, payload)


@router.delete(
    "/{template_id}", status_code=204, response_model=None, response_class=Response
)
def delete_email_template(template_id: UUID, db: Session = Depends(get_db)) -> Response:
    email_templates.delete_email_template(db, template_id)
    return Response(status_code=204)
