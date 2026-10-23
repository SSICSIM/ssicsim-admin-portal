"""add conference check-in for delegates and delegations

Revision ID: f3a9c7e1d5b2
Revises: e2f7a9c3b5d1
Create Date: 2026-10-23

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "f3a9c7e1d5b2"
down_revision = "e2f7a9c3b5d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "delegates",
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "delegations",
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Enum labels are the Python member names (see c3a8f6e4c397).
    op.execute("ALTER TYPE event_type_enum ADD VALUE IF NOT EXISTS 'CHECK_IN'")
    # The check-in page polls the log filtered to Check In entries.
    op.create_index(
        "ix_event_logs_event_type_timestamp", "event_logs", ["event_type", "timestamp"]
    )


def downgrade() -> None:
    op.drop_index("ix_event_logs_event_type_timestamp", table_name="event_logs")
    op.drop_column("delegations", "checked_in_at")
    op.drop_column("delegates", "checked_in_at")
    # Postgres doesn't support removing enum values
