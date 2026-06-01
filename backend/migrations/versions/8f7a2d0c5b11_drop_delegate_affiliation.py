"""drop_delegate_affiliation

Revision ID: 8f7a2d0c5b11
Revises: 6c1d3a9f8b44
Create Date: 2026-03-29 22:25:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "8f7a2d0c5b11"
down_revision = "6c1d3a9f8b44"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [column["name"] for column in inspector.get_columns("delegates")]
    if "affiliation" in columns:
        op.drop_column("delegates", "affiliation")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [column["name"] for column in inspector.get_columns("delegates")]
    if "affiliation" not in columns:
        op.add_column(
            "delegates", sa.Column("affiliation", sa.String(length=255), nullable=True)
        )
