from __future__ import annotations

import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.database import Base
from app.models.enums import CharacterExperience


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    committee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("committees.id", ondelete="CASCADE"),
        nullable=False,
    )
    delegate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("delegates.id", ondelete="SET NULL"), unique=True
    )
    priority: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # A character can suit more than one experience level (e.g. "Beginner or
    # Advanced"), so this is a list rather than a single value.
    experience: Mapped[list[CharacterExperience]] = mapped_column(
        ARRAY(
            Enum(
                CharacterExperience, name="character_experience_enum", native_enum=True
            )
        ),
        nullable=False,
        default=list,
        server_default="{}",
    )
