"""add_delegate_address_fields

Revision ID: 4f2b1a6d9c88
Revises: 3b4f0e2a1c7d
Create Date: 2026-03-29 21:32:00.000000

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4f2b1a6d9c88"
down_revision = "3b4f0e2a1c7d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("delegates", sa.Column("address_line1", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("address_line2", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("city", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("state", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("postal_code", sa.String(length=32), nullable=True))
    op.add_column("delegates", sa.Column("country", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("delegates", "country")
    op.drop_column("delegates", "postal_code")
    op.drop_column("delegates", "state")
    op.drop_column("delegates", "city")
    op.drop_column("delegates", "address_line2")
    op.drop_column("delegates", "address_line1")
