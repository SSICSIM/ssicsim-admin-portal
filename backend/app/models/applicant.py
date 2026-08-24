from __future__ import annotations

import uuid

from psycopg2.extras import DateTimeTZRange
from sqlalchemy import Enum, String
from sqlalchemy.dialects.postgresql import ARRAY, TSTZRANGE, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.database import Base
from app.models.enums import ApplicantStatus


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

    applicant_status: Mapped[ApplicantStatus | None] = mapped_column(
        Enum(ApplicantStatus, name="applicant_status_enum", native_enum=True),
        nullable=True,
    )

    availability: Mapped[list[DateTimeTZRange] | None] = mapped_column(ARRAY(TSTZRANGE))
