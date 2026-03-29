"""add_delegate_waitlist_fields

Revision ID: 6c1d3a9f8b44
Revises: 4f2b1a6d9c88
Create Date: 2026-03-29 22:05:00.000000

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6c1d3a9f8b44"
down_revision = "4f2b1a6d9c88"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("delegates", sa.Column("full_name", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("preferred_name", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("grade", sa.String(length=32), nullable=True))
    op.add_column("delegates", sa.Column("code_of_conduct_url", sa.String(length=1024), nullable=True))
    op.add_column("delegates", sa.Column("payment_policy_ack", sa.Boolean(), nullable=True))
    op.add_column("delegates", sa.Column("cancellation_policy_ack", sa.Boolean(), nullable=True))
    op.add_column("delegates", sa.Column("heard_about", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("delegates", "notes")
    op.drop_column("delegates", "heard_about")
    op.drop_column("delegates", "cancellation_policy_ack")
    op.drop_column("delegates", "payment_policy_ack")
    op.drop_column("delegates", "code_of_conduct_url")
    op.drop_column("delegates", "grade")
    op.drop_column("delegates", "preferred_name")
    op.drop_column("delegates", "full_name")
