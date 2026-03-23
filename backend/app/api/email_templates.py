from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.email_template import EmailTemplate
from app.schemas import EmailTemplateCreate, EmailTemplateOut, EmailTemplateUpdate

router = APIRouter(prefix="/email-templates", tags=["email-templates"])


@router.get("", response_model=list[EmailTemplateOut])
def list_email_templates(db: Session = Depends(get_db)) -> list[EmailTemplate]:
    return list(db.scalars(select(EmailTemplate).order_by(EmailTemplate.name)))


@router.post("", response_model=EmailTemplateOut, status_code=201)
def create_email_template(
    payload: EmailTemplateCreate, db: Session = Depends(get_db)
) -> EmailTemplate:
    email_template = EmailTemplate(
        name=payload.name,
        subject_template=payload.subject_template,
        body_template=payload.body_template,
        placeholders=payload.placeholders,
    )
    if payload.created_at is not None:
        email_template.created_at = payload.created_at
    if payload.updated_at is not None:
        email_template.updated_at = payload.updated_at
    db.add(email_template)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email template name already exists")
    db.refresh(email_template)
    return email_template


@router.get("/{template_id}", response_model=EmailTemplateOut)
def get_email_template(template_id: UUID, db: Session = Depends(get_db)) -> EmailTemplate:
    email_template = db.get(EmailTemplate, template_id)
    if email_template is None:
        raise HTTPException(status_code=404, detail="Email template not found")
    return email_template


@router.patch("/{template_id}", response_model=EmailTemplateOut)
def update_email_template(
    template_id: UUID, payload: EmailTemplateUpdate, db: Session = Depends(get_db)
) -> EmailTemplate:
    email_template = db.get(EmailTemplate, template_id)
    if email_template is None:
        raise HTTPException(status_code=404, detail="Email template not found")
    if payload.name is not None:
        email_template.name = payload.name
    if payload.subject_template is not None:
        email_template.subject_template = payload.subject_template
    if payload.body_template is not None:
        email_template.body_template = payload.body_template
    if payload.placeholders is not None:
        email_template.placeholders = payload.placeholders
    if payload.created_at is not None:
        email_template.created_at = payload.created_at
    if payload.updated_at is not None:
        email_template.updated_at = payload.updated_at
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email template name already exists")
    db.refresh(email_template)
    return email_template


@router.delete("/{template_id}", status_code=204, response_model=None, response_class=Response)
def delete_email_template(template_id: UUID, db: Session = Depends(get_db)) -> Response:
    email_template = db.get(EmailTemplate, template_id)
    if email_template is None:
        return Response(status_code=204)
    db.delete(email_template)
    db.commit()
    return Response(status_code=204)
