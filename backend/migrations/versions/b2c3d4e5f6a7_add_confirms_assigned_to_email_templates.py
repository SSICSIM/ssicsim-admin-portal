"""add_confirms_assigned_to_email_templates

Revision ID: b2c3d4e5f6a7
Revises: 9c8b6a2d3f1e
Create Date: 2026-05-31 00:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "b2c3d4e5f6a7"
down_revision = "9c8b6a2d3f1e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "email_templates",
        sa.Column(
            "confirms_assigned",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("email_templates", "confirms_assigned")
