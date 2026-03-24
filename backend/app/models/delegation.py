from __future__ import annotations

import uuid

from sqlalchemy import String
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
    faculty_advisor_first_name: Mapped[str | None] = mapped_column(String(255), nullable=False)
    faculty_advisor_last_name: Mapped[str | None] = mapped_column(String(255), nullable=False)
    faculty_advisor_email: Mapped[str | None] = mapped_column(String(255), nullable=False)
    head_delegate_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=False)
