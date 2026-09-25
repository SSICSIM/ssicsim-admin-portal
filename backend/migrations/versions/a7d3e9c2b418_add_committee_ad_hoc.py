"""add committee ad_hoc flag

Revision ID: a7d3e9c2b418
Revises: f1a2b3c4d5e6
Create Date: 2026-09-21

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a7d3e9c2b418"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "committees",
        sa.Column("ad_hoc", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("committees", "ad_hoc")
