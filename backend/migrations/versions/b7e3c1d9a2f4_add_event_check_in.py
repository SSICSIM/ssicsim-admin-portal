"""add checked_in_at to event registrations

Revision ID: b7e3c1d9a2f4
Revises: d5e8b1a4c7f2
Create Date: 2026-10-15

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "b7e3c1d9a2f4"
down_revision = "d5e8b1a4c7f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "event_registrations",
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("event_registrations", "checked_in_at")
