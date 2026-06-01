"""add_delegation_and_delegate_fields

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-06-01 00:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "e3f4a5b6c7d8"
down_revision = "d2e3f4a5b6c7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── delegations: new columns ──────────────────────────────────────────────
    op.add_column(
        "delegations", sa.Column("contact_role", sa.String(255), nullable=True)
    )
    op.add_column("delegations", sa.Column("school_address", sa.Text, nullable=True))
    op.add_column(
        "delegations", sa.Column("delegation_size", sa.Integer, nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("attended_before", sa.Boolean, nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("payment_process", sa.String(255), nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("policy_ack_registration", sa.Boolean, nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("policy_ack_payment", sa.Boolean, nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("policy_ack_cancellation", sa.Boolean, nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("policy_ack_conduct", sa.Boolean, nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("policy_ack_photography", sa.Boolean, nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("heard_about", sa.String(255), nullable=True)
    )
    op.add_column("delegations", sa.Column("notes", sa.Text, nullable=True))

    # ── delegates: code_of_conduct_signed ─────────────────────────────────────
    op.add_column(
        "delegates", sa.Column("code_of_conduct_signed", sa.Boolean, nullable=True)
    )


def downgrade() -> None:
    op.drop_column("delegates", "code_of_conduct_signed")

    for col in [
        "notes",
        "heard_about",
        "policy_ack_photography",
        "policy_ack_conduct",
        "policy_ack_cancellation",
        "policy_ack_payment",
        "policy_ack_registration",
        "payment_process",
        "attended_before",
        "delegation_size",
        "school_address",
        "contact_role",
    ]:
        op.drop_column("delegations", col)
