"""keep event registration open until 1 minute before each event

Revision ID: e2f7a9c3b5d1
Revises: c4d8e2a6f1b9
Create Date: 2026-10-22

"""

from __future__ import annotations

from alembic import op

revision = "e2f7a9c3b5d1"
down_revision = "c4d8e2a6f1b9"
branch_labels = None
depends_on = None

# Registration now closes 1 minute before each event starts (Toronto time).
# Delegate Training closes before its second session; the website stops
# sign-ups for the first session once it starts.
DEADLINES = {
    "midnight-crisis": "2026-10-23 19:29:00-04",
    "delegate-training": "2026-10-23 13:59:00-04",
    "delegate-social": "2026-10-24 18:59:00-04",
}


# Only moves deadlines later, so a later deadline set by hand is kept.
# Events with no deadline, or closed with the "Close registration" switch,
# are left as they are.
def upgrade() -> None:
    for slug, deadline in DEADLINES.items():
        op.execute(
            f"UPDATE events SET registration_deadline = '{deadline}' "
            f"WHERE slug = '{slug}' AND registration_deadline < '{deadline}'"
        )


# The earlier deadlines weren't all the same (some were changed by hand), so
# there's nothing reliable to restore. Set a deadline by hand if needed.
def downgrade() -> None:
    pass
