"""make_delegation_fields_nullable

Revision ID: 4a2c9b9f0f1c
Revises: 8f7a2d0c5b11
Create Date: 2026-03-29 22:45:00.000000

"""

from __future__ import annotations

from alembic import op


# revision identifiers, used by Alembic.
revision = "4a2c9b9f0f1c"
down_revision = "8f7a2d0c5b11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("delegations", "faculty_advisor_first_name", nullable=True)
    op.alter_column("delegations", "faculty_advisor_last_name", nullable=True)
    op.alter_column("delegations", "faculty_advisor_email", nullable=True)
    op.alter_column("delegations", "head_delegate_id", nullable=True)


def downgrade() -> None:
    op.alter_column("delegations", "faculty_advisor_first_name", nullable=False)
    op.alter_column("delegations", "faculty_advisor_last_name", nullable=False)
    op.alter_column("delegations", "faculty_advisor_email", nullable=False)
    op.alter_column("delegations", "head_delegate_id", nullable=False)
