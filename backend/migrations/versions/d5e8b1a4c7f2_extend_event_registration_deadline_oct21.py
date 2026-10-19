"""extend event registration deadline to October 21

Revision ID: d5e8b1a4c7f2
Revises: a9c4e2f7b3d1
Create Date: 2026-10-18

"""

from __future__ import annotations

from alembic import op

revision = "d5e8b1a4c7f2"
down_revision = "a9c4e2f7b3d1"
branch_labels = None
depends_on = None

SLUGS = "('midnight-crisis', 'delegate-social', 'delegate-training')"
OLD = "2026-10-18 23:59:59-04"
NEW = "2026-10-21 23:59:59-04"


# Registration now closes Wednesday, October 21, 2026 @ 11:59 PM Toronto time.
# Only events still on the previous deadline move, so a deadline changed by
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
