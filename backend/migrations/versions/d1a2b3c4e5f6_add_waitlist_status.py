"""add waitlist delegate status

Revision ID: d1a2b3c4e5f6
Revises: c9e1f2a3b4d5
Create Date: 2026-10-02

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "d1a2b3c4e5f6"
down_revision = "c9e1f2a3b4d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL 12+ allows ADD VALUE inside a transaction.
    # IF NOT EXISTS guards against re-running on a DB that already has the value.
    op.execute(
        sa.text(
            "ALTER TYPE delegate_status_enum ADD VALUE IF NOT EXISTS 'WAITLIST' BEFORE 'AWAITING_PAYMENT'"
        )
    )


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; a full type rebuild would
    # be required. For safety, downgrade is left as a no-op.
    pass
