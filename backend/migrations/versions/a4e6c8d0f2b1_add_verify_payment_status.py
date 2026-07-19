"""add_verify_payment_status

Revision ID: a4e6c8d0f2b1
Revises: 0e3da2469280
Create Date: 2026-07-18 12:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a4e6c8d0f2b1"
down_revision = "0e3da2469280"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL 12+ allows ADD VALUE inside a transaction.
    # IF NOT EXISTS guards against re-running on a DB that already has the value.
    op.execute(
        sa.text(
            "ALTER TYPE delegate_status_enum ADD VALUE IF NOT EXISTS 'VERIFY_PAYMENT' BEFORE 'AWAITING_ASSIGNMENT'"
        )
    )


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; a full type rebuild would
    # be required. For safety, downgrade is left as a no-op.
    pass
