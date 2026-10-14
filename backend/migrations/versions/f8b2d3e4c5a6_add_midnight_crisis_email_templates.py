"""add Midnight Crisis acceptance and rejection email templates

Revision ID: f8b2d3e4c5a6
Revises: e7a1c2d3b4f5
Create Date: 2026-10-13

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "f8b2d3e4c5a6"
down_revision = "e7a1c2d3b4f5"
branch_labels = None
depends_on = None

ACCEPTANCE = "Midnight Crisis – Acceptance"
REJECTION = "Midnight Crisis – Rejection"

TEMPLATES = [
    {
        "name": ACCEPTANCE,
        "subject": "You're in! SSICSIM 2026 Midnight Crisis",
        "body": (
            "Dear {preferred_name},\n\n"
            "Congratulations! We're excited to let you know that you have been "
            "**accepted** to Midnight Crisis at SSICSIM 2026.\n\n"
            "**Date:** Friday, October 23, 2026\n"
            "**Time:** 7:30 – 11:00 PM\n"
            "**Location:** OI 8200\n\n"
            "The committee topic will be revealed at the beginning of the session, "
            "so no preparation is needed. Just come with an open mind and be ready "
            "for chaos!\n\n"
            "As a reminder, attendance for the entire committee is mandatory. If you "
            "can no longer attend, please email "
            "[registration@ssicsim.ca](mailto:registration@ssicsim.ca) no later than "
            "Wednesday, October 21 @ 11:59 PM so we can offer your spot to another "
            "delegate.\n\n"
            "See you at midnight!\n\n"
            "Sincerely,\nThe SSICSIM Secretariat"
        ),
    },
    {
        "name": REJECTION,
        "subject": "SSICSIM 2026 Midnight Crisis Application",
        "body": (
            "Dear {preferred_name},\n\n"
            "Thank you for applying to Midnight Crisis at SSICSIM 2026. We received "
            "far more applications than we have spots for, and unfortunately we are "
            "unable to offer you a place this year.\n\n"
            "We truly appreciate your enthusiasm, and we hope you enjoy the rest of "
            "the conference, including the Delegate Social and everything else "
            "SSICSIM has to offer.\n\n"
            "If you have any questions, please contact us at "
            "[registration@ssicsim.ca](mailto:registration@ssicsim.ca).\n\n"
            "Sincerely,\nThe SSICSIM Secretariat"
        ),
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    for t in TEMPLATES:
        conn.execute(
            sa.text(
                """
                INSERT INTO email_templates (name, subject_template, body_template, placeholders)
                VALUES (:name, :subject, :body, ARRAY['preferred_name'])
                ON CONFLICT (name) DO NOTHING
                """
            ),
            t,
        )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM email_templates WHERE name IN (:a, :r)").bindparams(
            a=ACCEPTANCE, r=REJECTION
        )
    )
