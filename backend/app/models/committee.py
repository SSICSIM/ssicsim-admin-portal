from __future__ import annotations

import uuid

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.sql import text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Committee(Base):
    __tablename__ = "committees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    small_description: Mapped[str | None] = mapped_column(String(512), nullable=False)
    large_description: Mapped[str | None] = mapped_column(Text, nullable=False)
    director_name: Mapped[str | None] = mapped_column(String(255), nullable=False)
    chair_name: Mapped[str | None] = mapped_column(String(255))
    crisis_analysts: Mapped[list[str] | None] = mapped_column(ARRAY(String(255)))
    max_delegates: Mapped[int | None] = mapped_column(Integer)
    background_guide_link: Mapped[str | None] = mapped_column(String(1024))
    mechanics_guide_link: Mapped[str | None] = mapped_column(String(1024))
    character_guide_link: Mapped[str | None] = mapped_column(String(1024))
    image_url: Mapped[str | None] = mapped_column(String(1024))
