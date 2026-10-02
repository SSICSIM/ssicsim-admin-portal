"""add committee additional_links

Revision ID: c9e1f2a3b4d5
Revises: b8e4f0d3c529
Create Date: 2026-10-01

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "c9e1f2a3b4d5"
down_revision = "b8e4f0d3c529"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "committees",
        sa.Column(
            "additional_links",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("committees", "additional_links")
