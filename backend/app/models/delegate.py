from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
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
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    delegate_experience: Mapped[DelegateExperience] = mapped_column(
        Enum(DelegateExperience, name="delegate_experience_enum", native_enum=True)
    )
    first_committee: Mapped[str | None] = mapped_column(String(255), nullable=False)
    second_committee: Mapped[str | None] = mapped_column(String(255), nullable=False)
    third_committee: Mapped[str | None] = mapped_column(String(255), nullable=False)
    date_applied: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delegate_status: Mapped[DelegateStatus] = mapped_column(
        Enum(DelegateStatus, name="delegate_status_enum", native_enum=True)
    )
    delegation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("delegations.id")
    )


