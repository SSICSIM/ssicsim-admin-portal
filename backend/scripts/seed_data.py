from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models.committee import Committee
from app.models.delegate import Delegate
from app.models.delegation import Delegation
from app.models.email_template import EmailTemplate
from app.models.enums import DelegateExperience, DelegateStatus

COMMITTEES = [
    {
        "name": "Security Council",
        "small_description": "Crisis response, high stakes diplomacy.",
        "large_description": "A fast-moving crisis committee focused on urgent resolutions.",
        "director_name": "Avery Chen",
        "max_delegates": 30,
        "background_guide_link": "https://example.com/security-council-bg",
        "mechanics_guide_link": "https://example.com/security-council-mechanics",
        "character_guide_link": "https://example.com/security-council-characters",
    },
    {
        "name": "WHO Emergency Session",
        "small_description": "Global health coordination and policy.",
        "large_description": "Delegates respond to public health crises with rapid coordination.",
        "director_name": "Maya Patel",
        "max_delegates": 25,
        "background_guide_link": "https://example.com/who-bg",
        "mechanics_guide_link": "https://example.com/who-mechanics",
        "character_guide_link": "https://example.com/who-characters",
    },
    {
        "name": "UN Women Summit",
        "small_description": "Policy development for gender equity.",
        "large_description": "Delegates draft policy proposals to advance equity globally.",
        "director_name": "Talia Brooks",
        "max_delegates": 28,
        "background_guide_link": "https://example.com/unw-bg",
        "mechanics_guide_link": "https://example.com/unw-mechanics",
        "character_guide_link": "https://example.com/unw-characters",
    },
]

DELEGATIONS = [
    {
        "name": "Independent Delegate",
        "faculty_advisor_first_name": "Independent",
        "faculty_advisor_last_name": "Advisor",
        "faculty_advisor_email": "independent.advisor@example.com",
        "head_delegate_id": None,
    },
    {
        "name": "Sentosa",
        "faculty_advisor_first_name": "Alicia",
        "faculty_advisor_last_name": "Reed",
        "faculty_advisor_email": "advisor@sentosa.edu",
        "head_delegate_id": None,
    },
    {
        "name": "CodeX",
        "faculty_advisor_first_name": "Marvin",
        "faculty_advisor_last_name": "Patel",
        "faculty_advisor_email": "advisor@codex.edu",
        "head_delegate_id": None,
    },
    {
        "name": "Alexander Mackenzie High School",
        "faculty_advisor_first_name": "Helen",
        "faculty_advisor_last_name": "Park",
        "faculty_advisor_email": "advisor@amhs.edu",
        "head_delegate_id": None,
    },
    {
        "name": "Westmount Collegiate Institute",
        "faculty_advisor_first_name": "Jordan",
        "faculty_advisor_last_name": "Lee",
        "faculty_advisor_email": "advisor@westmount.edu",
        "head_delegate_id": None,
    },
]

DELEGATES = [
    {
        "first_name": "Lina",
        "last_name": "Morales",
        "full_name": "Lina Morales",
        "preferred_name": "Lina",
        "grade": "Grade 11",
        "delegation_name": "Independent Delegate",
        "email": "lina.morales@example.com",
        "delegate_experience": DelegateExperience.NOVICE,
        "first_committee": "Security Council",
        "second_committee": "WHO Emergency Session",
        "third_committee": "UN Women Summit",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "code_of_conduct_url": "https://example.com/coc/lina.pdf",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "School announcement",
        "notes": "Interested in crisis committees.",
    },
    {
        "first_name": "Owen",
        "last_name": "Price",
        "full_name": "Owen Price",
        "preferred_name": "Owen",
        "grade": "Grade 12",
        "delegation_name": "Sentosa",
        "email": "owen.price@example.com",
        "delegate_experience": DelegateExperience.INTERMEDIATE,
        "first_committee": "WHO Emergency Session",
        "second_committee": "Security Council",
        "third_committee": "UN Women Summit",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "code_of_conduct_url": "https://example.com/coc/owen.pdf",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Friend",
        "notes": "Wants to work on health policy.",
    },
    {
        "first_name": "Mina",
        "last_name": "Sato",
        "full_name": "Mina Sato",
        "preferred_name": "Mina",
        "grade": "Grade 10",
        "delegation_name": "CodeX",
        "email": "mina.sato@example.com",
        "delegate_experience": DelegateExperience.ADVANCED,
        "first_committee": "UN Women Summit",
        "second_committee": "Security Council",
        "third_committee": "WHO Emergency Session",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "code_of_conduct_url": "https://example.com/coc/mina.pdf",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Advisor",
        "notes": "Advanced delegate.",
    },
    {
        "first_name": "Arjun",
        "last_name": "Kapoor",
        "full_name": "Arjun Kapoor",
        "preferred_name": "Arjun",
        "grade": "Grade 12",
        "delegation_name": "Alexander Mackenzie High School",
        "email": "arjun.kapoor@example.com",
        "delegate_experience": DelegateExperience.INTERMEDIATE,
        "first_committee": "Security Council",
        "second_committee": "UN Women Summit",
        "third_committee": "WHO Emergency Session",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "code_of_conduct_url": "https://example.com/coc/arjun.pdf",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Instagram",
        "notes": "Interested in leadership roles.",
    },
    {
        "first_name": "Harper",
        "last_name": "Nguyen",
        "full_name": "Harper Nguyen",
        "preferred_name": "Harper",
        "grade": "Grade 9",
        "delegation_name": "Westmount Collegiate Institute",
        "email": "harper.nguyen@example.com",
        "delegate_experience": DelegateExperience.NOVICE,
        "first_committee": "WHO Emergency Session",
        "second_committee": "UN Women Summit",
        "third_committee": "Security Council",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "code_of_conduct_url": "https://example.com/coc/harper.pdf",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Newsletter",
        "notes": "First time MUN.",
    },
]


EMAIL_TEMPLATES = [
    {
        "name": "Assignment Notification",
        "subject_template": "Your SSICSIM 2026 Committee Assignment — {committee}",
        "body_template": "\n".join(
            [
                "Dear {preferred_name},",
                "",
                "We are thrilled to let you know that you have been officially assigned to {committee} as {character} for SSICSIM 2026!",
                "",
                "Please take a moment to review your assignment. If you have any questions, feel free to reach out to your committee director.",
                "",
                "We can't wait to see you at the conference!",
                "",
                "Warm regards,",
                "The SSICSIM Team",
            ]
        ),
        "confirms_assigned": True,
        "placeholders": ["preferred_name", "committee", "character"],
    },
    {
        "name": "Waitlist Notification",
        "subject_template": "SSICSIM 2026 — Application Update",
        "body_template": "\n".join(
            [
                "Dear {preferred_name},",
                "",
                "Thank you for applying to SSICSIM 2026. We appreciate your interest and the time you took to complete your application.",
                "",
                "At this time, you have been placed on our waitlist. We will be in touch as soon as a spot becomes available.",
                "",
                "Thank you for your patience and your continued interest in SSICSIM.",
                "",
                "Warm regards,",
                "The SSICSIM Team",
            ]
        ),
        "confirms_assigned": False,
        "placeholders": ["preferred_name"],
    },
    {
        "name": "Payment Reminder",
        "subject_template": "SSICSIM 2026 — Payment Reminder",
        "body_template": "\n".join(
            [
                "Dear {preferred_name},",
                "",
                "This is a friendly reminder that payment for SSICSIM 2026 is still outstanding.",
                "",
                "To secure your spot at the conference, please submit your payment at your earliest convenience. If you have any questions or concerns, please don't hesitate to reach out.",
                "",
                "Best regards,",
                "The SSICSIM Team",
            ]
        ),
        "confirms_assigned": False,
        "placeholders": ["preferred_name"],
    },
    {
        "name": "Payment Confirmed",
        "subject_template": "SSICSIM 2026 Registration Payment Confirmed",
        "body_template": "\n".join(
            [
                "Dear {preferred_name},",
                "",
                "Thank you for your payment. We have received and recorded it, and your registration for SSICSIM 2026 is confirmed.",
                "",
                "We have also acknowledged your committee preferences and will do our best to place you in your first-choice committee. Background guides are expected to be released toward the end of July, followed by committee assignments in August.",
                "",
                "Additional information and event updates will be shared as the conference approaches. Should you have any logistical questions in the meantime, please do not hesitate to contact us. We are always happy to help.",
                "",
                "We look forward to welcoming you to SSICSIM 2026.",
                "",
                "Best regards,",
                "The SSICSIM Team",
            ]
        ),
        "confirms_assigned": False,
        "confirms_payment": True,
        "placeholders": ["preferred_name"],
    },
]


def seed_email_templates(db):
    existing = set(db.scalars(select(EmailTemplate.name)).all())
    for payload in EMAIL_TEMPLATES:
        if payload["name"] in existing:
            continue
        db.add(EmailTemplate(**payload))


def seed_committees(db):
    existing = set(db.scalars(select(Committee.name)).all())
    for payload in COMMITTEES:
        if payload["name"] in existing:
            continue
        db.add(Committee(**payload))


def seed_delegations(db):
    existing = set(db.scalars(select(Delegation.name)).all())
    for payload in DELEGATIONS:
        if payload["name"] in existing:
            continue
        db.add(Delegation(**payload))


def seed_delegates(db):
    existing = set(db.scalars(select(Delegate.email)).all())
    delegation_map = {row.name: row.id for row in db.scalars(select(Delegation)).all()}
    for payload in DELEGATES:
        if payload["email"] in existing:
            continue
        payload_copy = payload.copy()
        delegation_name = payload_copy.pop("delegation_name", None)
        db.add(
            Delegate(
                **payload_copy,
                delegation_id=delegation_map.get(delegation_name),
                date_applied=datetime.now(UTC),
            )
        )


def main() -> None:
    db = SessionLocal()
    try:
        seed_email_templates(db)
        seed_committees(db)
        seed_delegations(db)
        seed_delegates(db)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
