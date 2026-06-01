"""update committee fields

Revision ID: a1b2c3d4e5f6
Revises: c1d2e3f4a5b6
Create Date: 2026-06-01

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("committees", "chair_name")
    op.drop_column("committees", "crisis_analysts")
    op.add_column("committees", sa.Column("director_image_url", sa.String(1024), nullable=True))
    op.add_column("committees", sa.Column("contact_email", sa.String(255), nullable=True))
    op.add_column("committees", sa.Column("joint", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("committees", sa.Column("double", sa.Boolean(), nullable=False, server_default="false"))
    op.alter_column("committees", "small_description", nullable=True)
    op.alter_column("committees", "large_description", nullable=True)


def downgrade() -> None:
    op.alter_column("committees", "large_description", nullable=False)
    op.alter_column("committees", "small_description", nullable=False)
    op.drop_column("committees", "double")
    op.drop_column("committees", "joint")
    op.drop_column("committees", "contact_email")
    op.drop_column("committees", "director_image_url")
    op.add_column("committees", sa.Column("chair_name", sa.String(255), nullable=True))
    op.add_column(
        "committees",
        sa.Column("crisis_analysts", sa.ARRAY(sa.String(255)), nullable=True),
    )
