"""add_character_name

Revision ID: 9c8b6a2d3f1e
Revises: 7e88398aa726
Create Date: 2026-03-29 20:40:00.000000

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9c8b6a2d3f1e"
down_revision = "7e88398aa726"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "characters",
        sa.Column("name", sa.String(length=255), nullable=False, server_default=""),
    )
    op.alter_column("characters", "name", server_default=None)


def downgrade() -> None:
    op.drop_column("characters", "name")
