"""drop_delegate_address_fields

Revision ID: 9b1a2c3d4e5f
Revises: 4a2c9b9f0f1c
Create Date: 2026-03-29 23:15:00.000000

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9b1a2c3d4e5f"
down_revision = "4a2c9b9f0f1c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("delegates", "address_line1")
    op.drop_column("delegates", "address_line2")
    op.drop_column("delegates", "city")
    op.drop_column("delegates", "state")
    op.drop_column("delegates", "postal_code")
    op.drop_column("delegates", "country")


def downgrade() -> None:
    op.add_column("delegates", sa.Column("address_line1", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("address_line2", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("city", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("state", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("postal_code", sa.String(length=32), nullable=True))
    op.add_column("delegates", sa.Column("country", sa.String(length=255), nullable=True))
