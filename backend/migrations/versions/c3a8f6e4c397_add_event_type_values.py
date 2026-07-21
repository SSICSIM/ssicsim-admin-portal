"""add_event_type_values

Revision ID: c3a8f6e4c397
Revises: 8f6a0ef36163
Create Date: 2026-07-18 01:43:42.021366

"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "c3a8f6e4c397"
down_revision = "8f6a0ef36163"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLAlchemy's Enum(EventType, ...) stores the Python member *name*
    # (ASSIGNMENT, EMAIL, ...) as the Postgres enum label, not `.value`.
    op.execute("ALTER TYPE event_type_enum ADD VALUE IF NOT EXISTS 'STATUS_CHANGE'")
    op.execute("ALTER TYPE event_type_enum ADD VALUE IF NOT EXISTS 'UNASSIGNMENT'")


def downgrade() -> None:
    pass  # Postgres doesn't support removing enum values
