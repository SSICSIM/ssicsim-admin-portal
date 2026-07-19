"""add_financial_aid_and_contact_fields

Revision ID: bd6dc12825f3
Revises: c3a8f6e4c397
Create Date: 2026-07-18 15:12:26.459425

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "bd6dc12825f3"
down_revision = "c3a8f6e4c397"
branch_labels = None
depends_on = None

financial_aid_status_enum = postgresql.ENUM(
    "YES", "NO", "DELEGATION_PAYING", name="financial_aid_status_enum"
)


def upgrade() -> None:
    # add_column doesn't create a brand-new native enum type on its own —
    # unlike create_all()/table creation, it needs to be created explicitly first.
    financial_aid_status_enum.create(op.get_bind(), checkfirst=True)

    op.add_column("delegates", sa.Column("phone", sa.String(length=64), nullable=True))
    op.add_column(
        "delegates", sa.Column("committee_selection_ack", sa.Boolean(), nullable=True)
    )
    op.add_column(
        "delegates",
        sa.Column("financial_aid_status", financial_aid_status_enum, nullable=True),
    )
    op.add_column(
        "delegates", sa.Column("financial_aid_reason", sa.Text(), nullable=True)
    )
    op.add_column(
        "delegates",
        sa.Column("payment_receipt_url", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "delegations", sa.Column("contact_phone", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("delegation_size_min", sa.Integer(), nullable=True)
    )
    op.add_column(
        "delegations", sa.Column("delegation_size_max", sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("delegations", "delegation_size_max")
    op.drop_column("delegations", "delegation_size_min")
    op.drop_column("delegations", "contact_phone")
    op.drop_column("delegates", "payment_receipt_url")
    op.drop_column("delegates", "financial_aid_reason")
    op.drop_column("delegates", "financial_aid_status")
    op.drop_column("delegates", "committee_selection_ack")
    op.drop_column("delegates", "phone")

    financial_aid_status_enum.drop(op.get_bind(), checkfirst=True)
