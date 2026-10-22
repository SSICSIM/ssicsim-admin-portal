"""add walk_in to event registrations

Revision ID: c4d8e2a6f1b9
Revises: b7e3c1d9a2f4
Create Date: 2026-10-21

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "c4d8e2a6f1b9"
down_revision = "b7e3c1d9a2f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "event_registrations",
        sa.Column("walk_in", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("event_registrations", "walk_in")
