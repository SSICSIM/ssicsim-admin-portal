from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.database import Base


class Delegation(Base):
    __tablename__ = "delegations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    # Faculty advisor contact
    faculty_advisor_first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    faculty_advisor_last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    faculty_advisor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_role: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Delegation details
    school_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    delegation_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attended_before: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    payment_process: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Policy acknowledgments (collected on the registration form)
    policy_ack_registration: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    policy_ack_payment: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    policy_ack_cancellation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    policy_ack_conduct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    policy_ack_photography: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Admin fields
    heard_about: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    head_delegate_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
