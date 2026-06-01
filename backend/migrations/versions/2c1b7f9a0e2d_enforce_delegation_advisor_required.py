"""enforce delegation advisor required

Revision ID: 2c1b7f9a0e2d
Revises: 9b1a2c3d4e5f
Create Date: 2026-04-03 02:05:00.000000

"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "2c1b7f9a0e2d"
down_revision = "9b1a2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        UPDATE delegations
        SET faculty_advisor_first_name = COALESCE(faculty_advisor_first_name, 'Independent'),
            faculty_advisor_last_name = COALESCE(faculty_advisor_last_name, 'Advisor'),
            faculty_advisor_email = COALESCE(faculty_advisor_email, 'independent.advisor@example.com')
        """)
    op.alter_column("delegations", "faculty_advisor_first_name", nullable=False)
    op.alter_column("delegations", "faculty_advisor_last_name", nullable=False)
    op.alter_column("delegations", "faculty_advisor_email", nullable=False)


def downgrade() -> None:
    op.alter_column("delegations", "faculty_advisor_first_name", nullable=True)
    op.alter_column("delegations", "faculty_advisor_last_name", nullable=True)
    op.alter_column("delegations", "faculty_advisor_email", nullable=True)
