from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    applicant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applicants.id", ondelete="SET NULL"), primary_key=True
    )
    sec_member_id1: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sec_members.id", ondelete="SET NULL")
    )
    sec_member_id2: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sec_members.id", ondelete="SET NULL")
    )
    
    isConfirmed1: Mapped[bool | None] = mapped_column(Boolean, default=False)
    isConfirmed2: Mapped[bool | None] = mapped_column(Boolean, default=False)

    interviewDateTime: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
