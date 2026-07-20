"""rename_delegate_experience_enum_values

Revision ID: d420f89b18b6
Revises: c68434c91f34
Create Date: 2026-07-19 00:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "d420f89b18b6"
down_revision = "c68434c91f34"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TYPE delegate_experience_enum RENAME VALUE 'BEGINNER' TO 'NOVICE'"))
    op.execute(sa.text("ALTER TYPE delegate_experience_enum RENAME VALUE 'EXPERTISE' TO 'ADVANCED'"))


def downgrade() -> None:
    op.execute(sa.text("ALTER TYPE delegate_experience_enum RENAME VALUE 'NOVICE' TO 'BEGINNER'"))
    op.execute(sa.text("ALTER TYPE delegate_experience_enum RENAME VALUE 'ADVANCED' TO 'EXPERTISE'"))
