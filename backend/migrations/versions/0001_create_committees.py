"""create committees

Revision ID: 0001_create_committees
Revises:
Create Date: 2026-03-11

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_create_committees"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "committees",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_committees_id"), "committees", ["id"], unique=False)
    op.create_index(op.f("ix_committees_name"), "committees", ["name"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_committees_name"), table_name="committees")
    op.drop_index(op.f("ix_committees_id"), table_name="committees")
    op.drop_table("committees")

