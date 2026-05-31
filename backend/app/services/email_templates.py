from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.email_template import EmailTemplate
from app.schemas import EmailTemplateCreate, EmailTemplateUpdate


def list_email_templates(db: Session) -> list[EmailTemplate]:
    return db.scalars(select(EmailTemplate).order_by(EmailTemplate.name)).all()


def get_email_template(db: Session, template_id: UUID) -> EmailTemplate:
    email_template = db.get(EmailTemplate, template_id)
    if email_template is None:
        raise HTTPException(status_code=404, detail="Email template not found")
    return email_template


def create_email_template(db: Session, payload: EmailTemplateCreate) -> EmailTemplate:
    email_template = EmailTemplate(
        name=payload.name,
        subject_template=payload.subject_template,
        body_template=payload.body_template,
        placeholders=payload.placeholders,
    )
    db.add(email_template)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email template name already exists")
    db.refresh(email_template)
    return email_template


def update_email_template(db: Session, template_id: UUID, payload: EmailTemplateUpdate) -> EmailTemplate:
    email_template = get_email_template(db, template_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(email_template, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email template name already exists")
    db.refresh(email_template)
    return email_template


def delete_email_template(db: Session, template_id: UUID) -> None:
    email_template = db.get(EmailTemplate, template_id)
    if email_template is None:
        return
    try:
        db.delete(email_template)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete email template")
