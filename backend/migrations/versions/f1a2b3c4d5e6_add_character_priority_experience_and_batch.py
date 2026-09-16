"""add_character_priority_experience_and_batch_id

Revision ID: f1a2b3c4d5e6
Revises: 1107e57c1b83
Create Date: 2026-09-15 00:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID

revision = "f1a2b3c4d5e6"
down_revision = "1107e57c1b83"
branch_labels = None
depends_on = None

character_experience_enum = postgresql.ENUM(
    "BEGINNER", "INTERMEDIATE", "ADVANCED", name="character_experience_enum"
)


def upgrade() -> None:
    character_experience_enum.create(op.get_bind(), checkfirst=True)
    op.add_column("characters", sa.Column("priority", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "ck_characters_priority_range",
        "characters",
        "priority IS NULL OR (priority BETWEEN 1 AND 5)",
    )
    # A character can suit more than one experience level (e.g. "Beginner or
    # Advanced"), so this is an array column rather than a single scalar.
    op.add_column(
        "characters",
        sa.Column(
            "experience",
            postgresql.ARRAY(character_experience_enum),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "event_logs", sa.Column("batch_id", UUID(as_uuid=True), nullable=True)
    )
    op.create_index("ix_event_logs_batch_id", "event_logs", ["batch_id"])
    # SQLAlchemy's Enum(EventType, ...) stores the Python member *name*
    # as the Postgres enum label, not `.value`.
    op.execute("ALTER TYPE event_type_enum ADD VALUE IF NOT EXISTS 'BATCH_EDIT'")


def downgrade() -> None:
    op.drop_index("ix_event_logs_batch_id", table_name="event_logs")
    op.drop_column("event_logs", "batch_id")
    op.drop_column("characters", "experience")
    op.drop_constraint("ck_characters_priority_range", "characters", type_="check")
    op.drop_column("characters", "priority")
    character_experience_enum.drop(op.get_bind(), checkfirst=True)
    # Postgres doesn't support removing enum values (BATCH_EDIT stays)
