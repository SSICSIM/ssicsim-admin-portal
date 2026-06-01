"""drop_character_committee_unique

Revision ID: 3b4f0e2a1c7d
Revises: 9c8b6a2d3f1e
Create Date: 2026-03-29 21:05:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "3b4f0e2a1c7d"
down_revision = "9c8b6a2d3f1e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    constraints = {c["name"] for c in inspector.get_unique_constraints("characters")}
    if "characters_committee_id_key" in constraints:
        op.drop_constraint("characters_committee_id_key", "characters", type_="unique")


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    constraints = {c["name"] for c in inspector.get_unique_constraints("characters")}
    if "characters_committee_id_key" not in constraints:
        op.create_unique_constraint(
            "characters_committee_id_key", "characters", ["committee_id"]
        )
