from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.database import Base


class Applicant(Base):
    __tablename__ = "applicants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )

    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )

    roles_of_interest: Mapped[list[str] | None] = mapped_column(
        ARRAY(String(255)), nullable=True
    )

    first_committee: Mapped[str] = mapped_column(String(255), nullable=False)
    second_committee: Mapped[str] = mapped_column(String(255), nullable=False)
    third_committee: Mapped[str] = mapped_column(String(255), nullable=False)



