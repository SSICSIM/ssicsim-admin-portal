"""add_financial_aid_contacted_and_event_type

Revision ID: 0e3da2469280
Revises: bd6dc12825f3
Create Date: 2026-07-18 16:32:20.533166

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0e3da2469280"
down_revision = "bd6dc12825f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "delegates", sa.Column("financial_aid_contacted", sa.Boolean(), nullable=True)
    )
    # SQLAlchemy's Enum(EventType, ...) stores the Python member *name* as the
    # Postgres enum label, not `.value` — see the STATUS_CHANGE/UNASSIGNMENT migration.
    op.execute(
        "ALTER TYPE event_type_enum ADD VALUE IF NOT EXISTS 'FINANCIAL_AID_CONTACT'"
    )


def downgrade() -> None:
    op.drop_column("delegates", "financial_aid_contacted")
    # Postgres doesn't support removing enum values
