"""add email template ad hoc body

Revision ID: b8e4f0d3c529
Revises: a7d3e9c2b418
Create Date: 2026-09-24

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "b8e4f0d3c529"
down_revision = "a7d3e9c2b418"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "email_templates",
        sa.Column("ad_hoc_body_template", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("email_templates", "ad_hoc_body_template")
