from __future__ import annotations

import uuid
from datetime import datetime

from psycopg2.extras import DateTimeTZRange
from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import ARRAY, TSTZRANGE, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.database import Base


class SecMember(Base):
    __tablename__ = "sec_members"

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
    role: Mapped[str] = mapped_column(String(255), nullable=False)

    availability: Mapped[list[DateTimeTZRange] | None] = mapped_column(ARRAY(TSTZRANGE))

    last_logged_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
