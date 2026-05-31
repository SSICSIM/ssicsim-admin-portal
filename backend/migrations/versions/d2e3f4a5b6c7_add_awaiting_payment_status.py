"""add_awaiting_payment_status

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-05-31 21:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "d2e3f4a5b6c7"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL 12+ allows ADD VALUE inside a transaction.
    # IF NOT EXISTS guards against re-running on a DB that already has the value.
    op.execute(
        sa.text(
            "ALTER TYPE delegate_status_enum ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT' BEFORE 'AWAITING_ASSIGNMENT'"
        )
    )


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; a full type rebuild would
    # be required. For safety, downgrade is left as a no-op.
    pass
