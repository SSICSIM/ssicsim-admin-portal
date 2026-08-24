"""add_registration_period

Revision ID: 1107e57c1b83
Revises: d420f89b18b6
Create Date: 2026-08-20 00:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "1107e57c1b83"
down_revision = "d420f89b18b6"
branch_labels = None
depends_on = None

registration_period_enum = postgresql.ENUM(
    "EARLY_BIRD", "REGULAR", "LATE", name="registration_period_enum"
)


def upgrade() -> None:
    registration_period_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "delegates",
        sa.Column("registration_period", registration_period_enum, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("delegates", "registration_period")
    registration_period_enum.drop(op.get_bind(), checkfirst=True)
