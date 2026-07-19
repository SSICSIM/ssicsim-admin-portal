from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import (
    DelegateExperience,
    DelegateStatus,
    EventType,
    FinancialAidStatus,
)


class HealthResponse(BaseModel):
    status: str = "ok"


# Committee schemas
class CommitteeBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    small_description: str | None = Field(default=None, max_length=512)
    large_description: str | None = None
    director_name: str = Field(default="Director", min_length=1, max_length=255)
    director_image_url: str | None = Field(default=None, max_length=1024)
    contact_email: str | None = Field(default=None, max_length=255)
    max_delegates: int | None = Field(default=None, ge=0)
    joint: bool = False
    double: bool = False
    background_guide_link: str | None = Field(default=None, max_length=1024)
    mechanics_guide_link: str | None = Field(default=None, max_length=1024)
    character_guide_link: str | None = Field(default=None, max_length=1024)
    image_url: str | None = Field(default=None, max_length=1024)


class CommitteeCreate(CommitteeBase):
    pass


class CommitteeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    small_description: str | None = Field(default=None, max_length=512)
    large_description: str | None = None
    director_name: str | None = Field(default=None, max_length=255)
    director_image_url: str | None = Field(default=None, max_length=1024)
    contact_email: str | None = Field(default=None, max_length=255)
    max_delegates: int | None = Field(default=None, ge=0)
    joint: bool | None = None
    double: bool | None = None
    background_guide_link: str | None = Field(default=None, max_length=1024)
    mechanics_guide_link: str | None = Field(default=None, max_length=1024)
    character_guide_link: str | None = Field(default=None, max_length=1024)
    image_url: str | None = Field(default=None, max_length=1024)


class CommitteeOut(CommitteeBase):
    id: UUID

    class Config:
        from_attributes = True


# Delegation schemas
class DelegationBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    faculty_advisor_first_name: str = Field(min_length=1, max_length=255)
    faculty_advisor_last_name: str = Field(min_length=1, max_length=255)
    faculty_advisor_email: EmailStr
    contact_role: str | None = Field(default=None, max_length=255)
    contact_phone: str | None = Field(default=None, max_length=64)
    school_address: str | None = None
    delegation_size: int | None = Field(default=None, ge=1)
    delegation_size_min: int | None = Field(default=None, ge=1)
    delegation_size_max: int | None = Field(default=None, ge=1)
    attended_before: bool | None = None
    payment_process: str | None = Field(default=None, max_length=255)
    policy_ack_registration: bool | None = None
    policy_ack_payment: bool | None = None
    policy_ack_cancellation: bool | None = None
    policy_ack_conduct: bool | None = None
    policy_ack_photography: bool | None = None
    heard_about: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    head_delegate_id: UUID | None = None


class DelegationCreate(DelegationBase):
    pass


class DelegationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    faculty_advisor_first_name: str | None = Field(default=None, max_length=255)
    faculty_advisor_last_name: str | None = Field(default=None, max_length=255)
    faculty_advisor_email: EmailStr | None = None
    contact_role: str | None = Field(default=None, max_length=255)
    contact_phone: str | None = Field(default=None, max_length=64)
    school_address: str | None = None
    delegation_size: int | None = Field(default=None, ge=1)
    delegation_size_min: int | None = Field(default=None, ge=1)
    delegation_size_max: int | None = Field(default=None, ge=1)
    attended_before: bool | None = None
    payment_process: str | None = Field(default=None, max_length=255)
    policy_ack_registration: bool | None = None
    policy_ack_payment: bool | None = None
    policy_ack_cancellation: bool | None = None
    policy_ack_conduct: bool | None = None
    policy_ack_photography: bool | None = None
    heard_about: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    head_delegate_id: UUID | None = None


class DelegationOut(DelegationBase):
    id: UUID

    class Config:
        from_attributes = True


# Delegate schemas
class DelegateBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    full_name: str | None = Field(default=None, max_length=255)
    preferred_name: str | None = Field(default=None, max_length=255)
    grade: str | None = Field(default=None, max_length=32)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=64)
    delegate_experience: DelegateExperience
    first_committee: str = Field(min_length=1, max_length=255)
    second_committee: str = Field(min_length=1, max_length=255)
    third_committee: str = Field(min_length=1, max_length=255)
    committee_selection_ack: bool | None = None
    date_applied: datetime | None = None
    delegate_status: DelegateStatus
    delegation_id: UUID | None = None
    code_of_conduct_url: str | None = Field(default=None, max_length=1024)
    code_of_conduct_signed: bool | None = None
    payment_policy_ack: bool | None = None
    cancellation_policy_ack: bool | None = None
    financial_aid_status: FinancialAidStatus | None = None
    financial_aid_reason: str | None = None
    financial_aid_contacted: bool | None = None
    payment_receipt_url: str | None = Field(default=None, max_length=1024)
    heard_about: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class DelegateCreate(DelegateBase):
    delegate_status: DelegateStatus = DelegateStatus.AWAITING_PAYMENT


class DelegateUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=255)
    last_name: str | None = Field(default=None, min_length=1, max_length=255)
    full_name: str | None = Field(default=None, max_length=255)
    preferred_name: str | None = Field(default=None, max_length=255)
    grade: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=64)
    delegate_experience: DelegateExperience | None = None
    first_committee: str | None = Field(default=None, max_length=255)
    second_committee: str | None = Field(default=None, max_length=255)
    third_committee: str | None = Field(default=None, max_length=255)
    committee_selection_ack: bool | None = None
    date_applied: datetime | None = None
    delegate_status: DelegateStatus | None = None
    delegation_id: UUID | None = None
    code_of_conduct_url: str | None = Field(default=None, max_length=1024)
    code_of_conduct_signed: bool | None = None
    payment_policy_ack: bool | None = None
    cancellation_policy_ack: bool | None = None
    financial_aid_status: FinancialAidStatus | None = None
    financial_aid_reason: str | None = None
    financial_aid_contacted: bool | None = None
    payment_receipt_url: str | None = Field(default=None, max_length=1024)
    heard_about: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class DelegateOut(DelegateBase):
    id: UUID

    class Config:
        from_attributes = True


# Character schemas
class CharacterBase(BaseModel):
    name: str = Field(default="Character", min_length=1, max_length=255)
    committee_id: UUID
    delegate_id: UUID | None = None


class CharacterCreate(CharacterBase):
    pass


class CharacterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    committee_id: UUID | None = None
    delegate_id: UUID | None = None


class CharacterOut(CharacterBase):
    id: UUID

    class Config:
        from_attributes = True


# Sec member schemas
class SecMemberBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    role: str = Field(min_length=1, max_length=255)
    interview_slots: list[datetime] | None = None;
    interviewees : list[UUID] | None = None;
    last_logged_in: datetime | None = None


class SecMemberCreate(SecMemberBase):
    pass


class SecMemberUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=255)
    last_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    role: str | None = Field(default=None, max_length=255)
    interview_slots: list[datetime] | None = None;
    interviewees : list[UUID] | None = None;
    last_logged_in: datetime | None = None


class SecMemberOut(SecMemberBase):
    id: UUID

    class Config:
        from_attributes = True


# Event log schemas
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


# Email template schemas
class EmailTemplateBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    subject_template: str = Field(min_length=1, max_length=255)
    body_template: str
    placeholders: list[str] | None = None
    confirms_assigned: bool = False
    confirms_payment: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class EmailTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    subject_template: str = Field(min_length=1, max_length=255)
    body_template: str
    placeholders: list[str] | None = None
    confirms_assigned: bool = False
    confirms_payment: bool = False


class EmailTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    subject_template: str | None = Field(default=None, min_length=1, max_length=255)
    body_template: str | None = None
    placeholders: list[str] | None = None
    confirms_assigned: bool | None = None
    confirms_payment: bool | None = None


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
