"""add events, event registrations, and event characters

Revision ID: e7a1c2d3b4f5
Revises: d1a2b3c4e5f6
Create Date: 2026-10-13

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID

revision = "e7a1c2d3b4f5"
down_revision = "d1a2b3c4e5f6"
branch_labels = None
depends_on = None

event_registration_status_enum = postgresql.ENUM(
    "PENDING",
    "REGISTERED",
    "WAITLIST",
    "ACCEPTED",
    "REJECTED",
    "WITHDRAWN",
    name="event_registration_status_enum",
    create_type=False,
)
character_experience_enum = postgresql.ENUM(
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    name="character_experience_enum",
    create_type=False,
)


def upgrade() -> None:
    event_registration_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "events",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column(
            "registration_open",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("registration_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "has_characters",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index("ix_events_id", "events", ["id"])
    op.create_index("ix_events_slug", "events", ["slug"], unique=True)

    op.create_table(
        "event_registrations",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "event_id",
            UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "delegate_id",
            UUID(as_uuid=True),
            sa.ForeignKey("delegates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", event_registration_status_enum, nullable=False),
        sa.Column("submitted_first_name", sa.String(255), nullable=True),
        sa.Column("submitted_last_name", sa.String(255), nullable=True),
        sa.Column(
            "answers",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("event_id", "delegate_id", name="uq_event_registration"),
    )
    op.create_index("ix_event_registrations_id", "event_registrations", ["id"])
    op.create_index(
        "ix_event_registrations_event_id", "event_registrations", ["event_id"]
    )
    op.create_index(
        "ix_event_registrations_delegate_id", "event_registrations", ["delegate_id"]
    )

    op.create_table(
        "event_characters",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "event_id",
            UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "registration_id",
            UUID(as_uuid=True),
            sa.ForeignKey("event_registrations.id", ondelete="SET NULL"),
            nullable=True,
            unique=True,
        ),
        sa.Column("priority", sa.Integer(), nullable=True),
        sa.Column(
            "experience",
            postgresql.ARRAY(character_experience_enum),
            nullable=False,
            server_default="{}",
        ),
        sa.CheckConstraint(
            "priority IS NULL OR (priority BETWEEN 1 AND 5)",
            name="ck_event_characters_priority_range",
        ),
    )
    op.create_index("ix_event_characters_id", "event_characters", ["id"])
    op.create_index("ix_event_characters_event_id", "event_characters", ["event_id"])

    # SQLAlchemy's Enum(EventType, ...) stores the Python member *name*.
    op.execute(
        "ALTER TYPE event_type_enum ADD VALUE IF NOT EXISTS 'EVENT_REGISTRATION'"
    )

    # Registration closes Saturday, October 17, 2026 @ 11:59 PM Toronto time.
    op.execute(
        """
        INSERT INTO events (slug, name, capacity, registration_deadline, has_characters)
        VALUES
          ('midnight-crisis', 'Midnight Crisis', 20, '2026-10-17 23:59:59-04', true),
          ('delegate-social', 'Delegate Social', 120, '2026-10-17 23:59:59-04', false),
          ('delegate-training', 'Delegate Training', 140, '2026-10-17 23:59:59-04', false)
        ON CONFLICT (slug) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("event_characters")
    op.drop_table("event_registrations")
    op.drop_table("events")
    event_registration_status_enum.drop(op.get_bind(), checkfirst=True)
    # Postgres doesn't support removing enum values (EVENT_REGISTRATION stays)
