from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.database import Base
from app.models.delegate import Delegate
from app.models.enums import CharacterExperience, EventRegistrationStatus


class Event(Base):
    """An optional conference event delegates sign up for (Midnight Crisis,
    Delegate Social, Delegate Training). Rows are seeded by migration."""

    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    slug: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Spots per event; for events with sessions it's the per-session cap of each
    # in-person session. Null = unlimited.
    capacity: Mapped[int | None] = mapped_column(Integer)
    registration_open: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    registration_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    # Midnight Crisis runs like a committee with its own characters.
    has_characters: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )


class EventRegistration(Base):
    __tablename__ = "event_registrations"
    __table_args__ = (
        UniqueConstraint("event_id", "delegate_id", name="uq_event_registration"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    delegate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delegates.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status: Mapped[EventRegistrationStatus] = mapped_column(
        Enum(
            EventRegistrationStatus,
            name="event_registration_status_enum",
            native_enum=True,
        ),
        nullable=False,
    )
    # The name as typed on the event form, kept so SEC can audit the
    # cross-check against the delegate record.
    submitted_first_name: Mapped[str | None] = mapped_column(String(255))
    submitted_last_name: Mapped[str | None] = mapped_column(String(255))
    # Event-specific form answers (dietary needs, training session, ...).
    answers: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=text("now()"),
    )

    # Delegate details are read live from the delegate record, never copied.
    delegate: Mapped[Delegate] = relationship(lazy="joined")
    character: Mapped[EventCharacter | None] = relationship(
        back_populates="registration", uselist=False, lazy="selectin"
    )


class EventCharacter(Base):
    """A character in an event run like a committee (Midnight Crisis). Kept
    apart from `characters` because characters.delegate_id is unique, and a
    delegate holds a committee character and an event character at once."""

    __tablename__ = "event_characters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    registration_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("event_registrations.id", ondelete="SET NULL"),
        unique=True,
    )
    priority: Mapped[int | None] = mapped_column(Integer)
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

    registration: Mapped[EventRegistration | None] = relationship(
        back_populates="character"
    )
