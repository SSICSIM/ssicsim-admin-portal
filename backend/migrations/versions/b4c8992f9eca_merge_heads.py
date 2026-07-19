"""merge_heads

Revision ID: b4c8992f9eca
Revises: a1b2c3d4e5f6, e3f4a5b6c7d8
Create Date: 2026-07-17 18:57:42.486875

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b4c8992f9eca'
down_revision = ('a1b2c3d4e5f6', 'e3f4a5b6c7d8')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

