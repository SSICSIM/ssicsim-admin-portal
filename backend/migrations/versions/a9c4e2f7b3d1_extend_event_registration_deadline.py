"""extend event registration deadline to October 18

Revision ID: a9c4e2f7b3d1
Revises: f8b2d3e4c5a6
Create Date: 2026-10-14

"""

from __future__ import annotations

from alembic import op

revision = "a9c4e2f7b3d1"
down_revision = "f8b2d3e4c5a6"
branch_labels = None
depends_on = None

SLUGS = "('midnight-crisis', 'delegate-social', 'delegate-training')"
OLD = "2026-10-17 23:59:59-04"
NEW = "2026-10-18 23:59:59-04"


# Registration now closes Sunday, October 18, 2026 @ 11:59 PM Toronto time.
# Only events still on the original deadline move, so a deadline changed by
# hand isn't overwritten.
def upgrade() -> None:
    op.execute(
        f"UPDATE events SET registration_deadline = '{NEW}' "
        f"WHERE slug IN {SLUGS} AND registration_deadline = '{OLD}'"
    )


def downgrade() -> None:
    op.execute(
        f"UPDATE events SET registration_deadline = '{OLD}' "
        f"WHERE slug IN {SLUGS} AND registration_deadline = '{NEW}'"
    )
