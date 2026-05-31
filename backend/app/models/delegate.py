from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.database import Base
from app.models.enums import DelegateExperience, DelegateStatus


class Delegate(Base):
    __tablename__ = "delegates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preferred_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    delegate_experience: Mapped[DelegateExperience] = mapped_column(
        Enum(DelegateExperience, name="delegate_experience_enum", native_enum=True)
    )
    first_committee: Mapped[str] = mapped_column(String(255), nullable=False)
    second_committee: Mapped[str] = mapped_column(String(255), nullable=False)
    third_committee: Mapped[str] = mapped_column(String(255), nullable=False)
    date_applied: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delegate_status: Mapped[DelegateStatus] = mapped_column(
        Enum(DelegateStatus, name="delegate_status_enum", native_enum=True), default=DelegateStatus.AWAITING_PAYMENT
    )
    delegation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("delegations.id"))
    code_of_conduct_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    payment_policy_ack: Mapped[bool | None] = mapped_column(nullable=True)
    cancellation_policy_ack: Mapped[bool | None] = mapped_column(nullable=True)
    heard_about: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
