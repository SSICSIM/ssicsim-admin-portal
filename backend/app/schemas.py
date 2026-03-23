from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import DelegateExperience, DelegateStatus, EventType


class HealthResponse(BaseModel):
    status: str = "ok"


class CommitteeBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    small_description: str | None = Field(default=None, max_length=512)
    large_description: str | None = None
    director_name: str | None = Field(default=None, max_length=255)
    chair_name: str | None = Field(default=None, max_length=255)
    crisis_analysts: list[str] | None = None
    max_delegates: int | None = Field(default=None, ge=0)
    background_guide_link: str | None = Field(default=None, max_length=1024)
    mechanics_guide_link: str | None = Field(default=None, max_length=1024)
    character_guide_link: str | None = Field(default=None, max_length=1024)


class CommitteeCreate(CommitteeBase):
    pass


class CommitteeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    small_description: str | None = Field(default=None, max_length=512)
    large_description: str | None = None
    director_name: str | None = Field(default=None, max_length=255)
    chair_name: str | None = Field(default=None, max_length=255)
    crisis_analysts: list[str] | None = None
    max_delegates: int | None = Field(default=None, ge=0)
    background_guide_link: str | None = Field(default=None, max_length=1024)
    mechanics_guide_link: str | None = Field(default=None, max_length=1024)
    character_guide_link: str | None = Field(default=None, max_length=1024)


class CommitteeOut(CommitteeBase):
    id: UUID

    class Config:
        from_attributes = True


class DelegationBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    faculty_advisor_first_name: str | None = Field(default=None, max_length=255)
    faculty_advisor_last_name: str | None = Field(default=None, max_length=255)
    faculty_advisor_email: EmailStr | None = None
    head_delegate_id: UUID | None = None


class DelegationCreate(DelegationBase):
    pass


class DelegationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    faculty_advisor_first_name: str | None = Field(default=None, max_length=255)
    faculty_advisor_last_name: str | None = Field(default=None, max_length=255)
    faculty_advisor_email: EmailStr | None = None
    head_delegate_id: UUID | None = None


class DelegationOut(DelegationBase):
    id: UUID

    class Config:
        from_attributes = True


class DelegateBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    delegate_experience: DelegateExperience
    first_committee: str | None = Field(default=None, max_length=255)
    second_committee: str | None = Field(default=None, max_length=255)
    third_committee: str | None = Field(default=None, max_length=255)
    date_applied: datetime | None = None
    delegate_status: DelegateStatus
    delegation_id: UUID | None = None


class DelegateCreate(DelegateBase):
    pass


class DelegateUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=255)
    last_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    delegate_experience: DelegateExperience | None = None
    first_committee: str | None = Field(default=None, max_length=255)
    second_committee: str | None = Field(default=None, max_length=255)
    third_committee: str | None = Field(default=None, max_length=255)
    date_applied: datetime | None = None
    delegate_status: DelegateStatus | None = None
    delegation_id: UUID | None = None


class DelegateOut(DelegateBase):
    id: UUID

    class Config:
        from_attributes = True


class CharacterBase(BaseModel):
    committee_id: UUID
    delegate_id: UUID | None = None


class CharacterCreate(CharacterBase):
    pass


class CharacterUpdate(BaseModel):
    committee_id: UUID | None = None
    delegate_id: UUID | None = None


class CharacterOut(CharacterBase):
    id: UUID

    class Config:
        from_attributes = True


class SecMemberBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    role: str | None = Field(default=None, max_length=255)
    last_logged_in: datetime | None = None


class SecMemberCreate(SecMemberBase):
    pass


class SecMemberUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=255)
    last_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    role: str | None = Field(default=None, max_length=255)
    last_logged_in: datetime | None = None


class SecMemberOut(SecMemberBase):
    id: UUID

    class Config:
        from_attributes = True


class EventLogBase(BaseModel):
    sec_member_id: UUID | None = None
    timestamp: datetime | None = None
    event_type: EventType
    target_type: str | None = Field(default=None, max_length=255)
    target_id: str | None = Field(default=None, max_length=255)
    details: str | None = None


class EventLogCreate(EventLogBase):
    pass


class EventLogUpdate(BaseModel):
    sec_member_id: UUID | None = None
    timestamp: datetime | None = None
    event_type: EventType | None = None
    target_type: str | None = Field(default=None, max_length=255)
    target_id: str | None = Field(default=None, max_length=255)
    details: str | None = None


class EventLogOut(EventLogBase):
    id: UUID

    class Config:
        from_attributes = True


class EmailTemplateBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    subject_template: str = Field(min_length=1, max_length=255)
    body_template: str
    placeholders: list[str] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    subject_template: str | None = Field(default=None, min_length=1, max_length=255)
    body_template: str | None = None
    placeholders: list[str] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class EmailTemplateOut(EmailTemplateBase):
    id: UUID

    class Config:
        from_attributes = True


class AssignmentCreate(BaseModel):
    delegate_id: UUID
    character_id: UUID


class AssignmentBulkCreate(BaseModel):
    assignments: list[AssignmentCreate]


class AssignmentUpdate(BaseModel):
    character_id: UUID


class AssignmentOut(BaseModel):
    delegate_id: UUID
    character_id: UUID
    committee_id: UUID

    class Config:
        from_attributes = True


def assignment_from_character(character: Any) -> AssignmentOut:
    return AssignmentOut(
        delegate_id=character.delegate_id,
        character_id=character.id,
        committee_id=character.committee_id,
    )

