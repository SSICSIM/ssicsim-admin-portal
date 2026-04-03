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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("delegates")}
    for column in [
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "country",
    ]:
        if column in columns:
            op.drop_column("delegates", column)


def downgrade() -> None:
    op.add_column("delegates", sa.Column("address_line1", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("address_line2", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("city", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("state", sa.String(length=255), nullable=True))
    op.add_column("delegates", sa.Column("postal_code", sa.String(length=32), nullable=True))
    op.add_column("delegates", sa.Column("country", sa.String(length=255), nullable=True))
