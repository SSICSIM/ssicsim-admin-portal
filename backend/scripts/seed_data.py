from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models.character import Character
from app.models.committee import Committee
from app.models.delegate import Delegate
from app.models.delegation import Delegation
from app.models.email_template import EmailTemplate
from app.models.enums import (
    CharacterExperience,
    DelegateExperience,
    DelegateStatus,
    FinancialAidStatus,
)
from app.services.delegates import _compute_registration_period

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
    {
        "name": "Human Rights Council",
        "small_description": "Investigating and responding to human rights abuses.",
        "large_description": "Delegates draft resolutions addressing ongoing human rights crises.",
        "director_name": "Sam Rivera",
        "max_delegates": 26,
        "background_guide_link": "https://example.com/hrc-bg",
        "mechanics_guide_link": "https://example.com/hrc-mechanics",
        "character_guide_link": "https://example.com/hrc-characters",
    },
    {
        "name": "Historical Crisis: Cuban Missile",
        "small_description": "1962 crisis committee — real-time historical decision making.",
        "large_description": "Delegates portray real historical figures navigating the Cuban Missile Crisis.",
        "director_name": "Jordan Kim",
        "max_delegates": 20,
        "background_guide_link": "https://example.com/cuban-bg",
        "mechanics_guide_link": "https://example.com/cuban-mechanics",
        "character_guide_link": "https://example.com/cuban-characters",
    },
]

CHARACTERS = {
    "Security Council": [
        ("United States", 5, [CharacterExperience.ADVANCED]),
        (
            "Russian Federation",
            5,
            [CharacterExperience.ADVANCED, CharacterExperience.INTERMEDIATE],
        ),
        ("France", 4, [CharacterExperience.INTERMEDIATE]),
        ("United Kingdom", 3, [CharacterExperience.INTERMEDIATE]),
        ("China", 5, [CharacterExperience.ADVANCED]),
        ("Kenya", 2, [CharacterExperience.BEGINNER]),
    ],
    "WHO Emergency Session": [
        ("WHO Director-General", 5, [CharacterExperience.ADVANCED]),
        ("United States", 4, [CharacterExperience.INTERMEDIATE]),
        ("India", 3, [CharacterExperience.INTERMEDIATE, CharacterExperience.BEGINNER]),
        ("Brazil", 2, [CharacterExperience.BEGINNER]),
        ("Nigeria", 2, [CharacterExperience.BEGINNER]),
        ("Germany", 3, [CharacterExperience.INTERMEDIATE]),
    ],
    "UN Women Summit": [
        ("Sweden", 4, [CharacterExperience.ADVANCED]),
        ("Rwanda", 3, [CharacterExperience.INTERMEDIATE]),
        ("Saudi Arabia", 5, [CharacterExperience.ADVANCED]),
        ("Canada", 2, [CharacterExperience.BEGINNER, CharacterExperience.INTERMEDIATE]),
        ("Iceland", 1, [CharacterExperience.BEGINNER]),
        ("Japan", 3, [CharacterExperience.INTERMEDIATE]),
    ],
    "Human Rights Council": [
        ("Germany", 4, [CharacterExperience.ADVANCED]),
        ("Venezuela", 5, [CharacterExperience.ADVANCED]),
        ("Somalia", 2, [CharacterExperience.BEGINNER]),
        ("Norway", 1, [CharacterExperience.BEGINNER]),
        ("Philippines", 3, [CharacterExperience.INTERMEDIATE]),
        (
            "South Africa",
            3,
            [CharacterExperience.INTERMEDIATE, CharacterExperience.ADVANCED],
        ),
    ],
    "Historical Crisis: Cuban Missile": [
        ("John F. Kennedy", 5, [CharacterExperience.ADVANCED]),
        ("Nikita Khrushchev", 5, [CharacterExperience.ADVANCED]),
        ("Robert McNamara", 4, [CharacterExperience.INTERMEDIATE]),
        ("Fidel Castro", 4, [CharacterExperience.ADVANCED]),
        ("Adlai Stevenson", 2, [CharacterExperience.BEGINNER]),
        ("Dean Rusk", 3, [CharacterExperience.INTERMEDIATE]),
    ],
}

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
    {
        "name": "Northgate Academy",
        "faculty_advisor_first_name": "Priya",
        "faculty_advisor_last_name": "Menon",
        "faculty_advisor_email": "advisor@northgate.edu",
        "head_delegate_id": None,
    },
    {
        "name": "Riverside International School",
        "faculty_advisor_first_name": "Carlos",
        "faculty_advisor_last_name": "Diaz",
        "faculty_advisor_email": "advisor@riverside.edu",
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
    {
        "first_name": "Priya",
        "last_name": "Anand",
        "full_name": "Priya Anand",
        "preferred_name": "Priya",
        "grade": "Grade 11",
        "delegation_name": "Sentosa",
        "email": "priya.anand@example.com",
        "delegate_experience": DelegateExperience.INTERMEDIATE,
        "first_committee": "Security Council",
        "second_committee": "WHO Emergency Session",
        "third_committee": "UN Women Summit",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "code_of_conduct_url": "https://example.com/coc/priya.pdf",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "School announcement",
        "notes": "Registered during the early bird window.",
        "date_applied": datetime(2026, 5, 15, tzinfo=UTC),
    },
    {
        "first_name": "Diego",
        "last_name": "Ramirez",
        "full_name": "Diego Ramirez",
        "preferred_name": "Diego",
        "grade": "Grade 10",
        "delegation_name": "CodeX",
        "email": "diego.ramirez@example.com",
        "delegate_experience": DelegateExperience.NOVICE,
        "first_committee": "WHO Emergency Session",
        "second_committee": "Security Council",
        "third_committee": "UN Women Summit",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "code_of_conduct_url": "https://example.com/coc/diego.pdf",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Friend",
        "notes": "Registered during the regular window.",
        "date_applied": datetime(2026, 7, 1, tzinfo=UTC),
    },
    {
        "first_name": "Freya",
        "last_name": "Olsen",
        "full_name": "Freya Olsen",
        "preferred_name": "Freya",
        "grade": "Grade 12",
        "delegation_name": "Westmount Collegiate Institute",
        "email": "freya.olsen@example.com",
        "delegate_experience": DelegateExperience.ADVANCED,
        "first_committee": "UN Women Summit",
        "second_committee": "Security Council",
        "third_committee": "WHO Emergency Session",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "code_of_conduct_url": "https://example.com/coc/freya.pdf",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Advisor",
        "notes": "Registered after the regular deadline.",
        "date_applied": datetime(2026, 8, 15, tzinfo=UTC),
    },
    {
        "first_name": "Noah",
        "last_name": "Bennett",
        "full_name": "Noah Bennett",
        "preferred_name": "Noah",
        "grade": "Grade 9",
        "delegation_name": "Northgate Academy",
        "email": "noah.bennett@example.com",
        "delegate_experience": DelegateExperience.NOVICE,
        "first_committee": "Security Council",
        "second_committee": "Human Rights Council",
        "third_committee": "WHO Emergency Session",
        "delegate_status": DelegateStatus.AWAITING_PAYMENT,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "School announcement",
        "notes": "Hasn't paid yet.",
        "date_applied": datetime(2026, 6, 1, tzinfo=UTC),
    },
    {
        "first_name": "Sofia",
        "last_name": "Reyes",
        "full_name": "Sofia Reyes",
        "preferred_name": "Sofia",
        "grade": "Grade 11",
        "delegation_name": "Riverside International School",
        "email": "sofia.reyes@example.com",
        "delegate_experience": DelegateExperience.INTERMEDIATE,
        "first_committee": "WHO Emergency Session",
        "second_committee": "UN Women Summit",
        "third_committee": "Human Rights Council",
        "delegate_status": DelegateStatus.VERIFY_PAYMENT,
        "financial_aid_status": FinancialAidStatus.YES,
        "financial_aid_reason": "Family financial hardship.",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Friend",
        "notes": "Payment receipt uploaded, pending verification.",
        "date_applied": datetime(2026, 6, 20, tzinfo=UTC),
    },
    {
        "first_name": "Ethan",
        "last_name": "Brooks",
        "full_name": "Ethan Brooks",
        "preferred_name": "Ethan",
        "grade": "Grade 12",
        "delegation_name": "Sentosa",
        "email": "ethan.brooks@example.com",
        "delegate_experience": DelegateExperience.ADVANCED,
        "first_committee": "Historical Crisis: Cuban Missile",
        "second_committee": "Security Council",
        "third_committee": "Human Rights Council",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "financial_aid_status": FinancialAidStatus.NO,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Instagram",
        "notes": "Wants a historical crisis committee.",
        "date_applied": datetime(2026, 8, 1, tzinfo=UTC),
    },
    {
        "first_name": "Aisha",
        "last_name": "Khan",
        "full_name": "Aisha Khan",
        "preferred_name": "Aisha",
        "grade": "Grade 10",
        "delegation_name": "CodeX",
        "email": "aisha.khan@example.com",
        "delegate_experience": DelegateExperience.NOVICE,
        "first_committee": "Human Rights Council",
        "second_committee": "UN Women Summit",
        "third_committee": "WHO Emergency Session",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "financial_aid_status": FinancialAidStatus.DELEGATION_PAYING,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Advisor",
        "notes": "Delegation covering registration cost.",
        "date_applied": datetime(2026, 8, 10, tzinfo=UTC),
    },
    {
        "first_name": "Liam",
        "last_name": "O'Connor",
        "full_name": "Liam O'Connor",
        "preferred_name": "Liam",
        "grade": "Grade 11",
        "delegation_name": "Alexander Mackenzie High School",
        "email": "liam.oconnor@example.com",
        "delegate_experience": DelegateExperience.INTERMEDIATE,
        "first_committee": "Security Council",
        "second_committee": "Historical Crisis: Cuban Missile",
        "third_committee": "Human Rights Council",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Newsletter",
        "notes": "Registered during the regular window.",
        "date_applied": datetime(2026, 8, 5, tzinfo=UTC),
    },
    {
        "first_name": "Zara",
        "last_name": "Ahmed",
        "full_name": "Zara Ahmed",
        "preferred_name": "Zara",
        "grade": "Grade 12",
        "delegation_name": "Westmount Collegiate Institute",
        "email": "zara.ahmed@example.com",
        "delegate_experience": DelegateExperience.ADVANCED,
        "first_committee": "UN Women Summit",
        "second_committee": "Human Rights Council",
        "third_committee": "Security Council",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "financial_aid_status": FinancialAidStatus.YES,
        "financial_aid_reason": "Requested need-based aid.",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "School announcement",
        "notes": "Registered during the regular window.",
        "date_applied": datetime(2026, 9, 1, tzinfo=UTC),
    },
    {
        "first_name": "Marcus",
        "last_name": "Chen",
        "full_name": "Marcus Chen",
        "preferred_name": "Marcus",
        "grade": "Grade 10",
        "delegation_name": "Northgate Academy",
        "email": "marcus.chen@example.com",
        "delegate_experience": DelegateExperience.INTERMEDIATE,
        "first_committee": "Human Rights Council",
        "second_committee": "Security Council",
        "third_committee": "UN Women Summit",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Friend",
        "notes": "Will be assigned to Human Rights Council.",
        "date_applied": datetime(2026, 6, 10, tzinfo=UTC),
    },
    {
        "first_name": "Isabella",
        "last_name": "Fontaine",
        "full_name": "Isabella Fontaine",
        "preferred_name": "Bella",
        "grade": "Grade 12",
        "delegation_name": "Riverside International School",
        "email": "isabella.fontaine@example.com",
        "delegate_experience": DelegateExperience.ADVANCED,
        "first_committee": "UN Women Summit",
        "second_committee": "Human Rights Council",
        "third_committee": "WHO Emergency Session",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "financial_aid_status": FinancialAidStatus.NO,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Advisor",
        "notes": "Will be assigned to UN Women Summit.",
        "date_applied": datetime(2026, 7, 20, tzinfo=UTC),
    },
    {
        "first_name": "Gabriel",
        "last_name": "Silva",
        "full_name": "Gabriel Silva",
        "preferred_name": "Gabriel",
        "grade": "Grade 9",
        "delegation_name": "Sentosa",
        "email": "gabriel.silva@example.com",
        "delegate_experience": DelegateExperience.NOVICE,
        "first_committee": "Historical Crisis: Cuban Missile",
        "second_committee": "Security Council",
        "third_committee": "WHO Emergency Session",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "financial_aid_status": FinancialAidStatus.YES,
        "financial_aid_reason": "First-generation delegate scholarship.",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "School announcement",
        "notes": "Will be assigned and confirmed.",
        "date_applied": datetime(2026, 6, 25, tzinfo=UTC),
    },
    {
        "first_name": "Nadia",
        "last_name": "Petrov",
        "full_name": "Nadia Petrov",
        "preferred_name": "Nadia",
        "grade": "Grade 11",
        "delegation_name": "CodeX",
        "email": "nadia.petrov@example.com",
        "delegate_experience": DelegateExperience.INTERMEDIATE,
        "first_committee": "Security Council",
        "second_committee": "Human Rights Council",
        "third_committee": "UN Women Summit",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "financial_aid_status": FinancialAidStatus.DELEGATION_PAYING,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Friend",
        "notes": "Will be assigned and confirmed.",
        "date_applied": datetime(2026, 8, 20, tzinfo=UTC),
    },
    {
        "first_name": "Tomas",
        "last_name": "Novak",
        "full_name": "Tomas Novak",
        "preferred_name": "Tomas",
        "grade": "Grade 12",
        "delegation_name": "Alexander Mackenzie High School",
        "email": "tomas.novak@example.com",
        "delegate_experience": DelegateExperience.ADVANCED,
        "first_committee": "Historical Crisis: Cuban Missile",
        "second_committee": "Security Council",
        "third_committee": "Human Rights Council",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Instagram",
        "notes": "Registered after the regular deadline.",
        "date_applied": datetime(2026, 9, 25, tzinfo=UTC),
    },
    {
        "first_name": "Ingrid",
        "last_name": "Larsen",
        "full_name": "Ingrid Larsen",
        "preferred_name": "Ingrid",
        "grade": "Grade 10",
        "delegation_name": "Westmount Collegiate Institute",
        "email": "ingrid.larsen@example.com",
        "delegate_experience": DelegateExperience.NOVICE,
        "first_committee": "UN Women Summit",
        "second_committee": "WHO Emergency Session",
        "third_committee": "Security Council",
        "delegate_status": DelegateStatus.AWAITING_PAYMENT,
        "financial_aid_status": FinancialAidStatus.YES,
        "financial_aid_reason": "Requested need-based aid.",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Newsletter",
        "notes": "Registered after the regular deadline, hasn't paid yet.",
        "date_applied": datetime(2026, 9, 22, tzinfo=UTC),
    },
    {
        "first_name": "Kwame",
        "last_name": "Mensah",
        "full_name": "Kwame Mensah",
        "preferred_name": "Kwame",
        "grade": "Grade 11",
        "delegation_name": "Northgate Academy",
        "email": "kwame.mensah@example.com",
        "delegate_experience": DelegateExperience.INTERMEDIATE,
        "first_committee": "Human Rights Council",
        "second_committee": "Security Council",
        "third_committee": "Historical Crisis: Cuban Missile",
        "delegate_status": DelegateStatus.VERIFY_PAYMENT,
        "financial_aid_status": FinancialAidStatus.NO,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Advisor",
        "notes": "Payment receipt uploaded, pending verification.",
        "date_applied": datetime(2026, 6, 5, tzinfo=UTC),
    },
    {
        "first_name": "Yuki",
        "last_name": "Tanaka",
        "full_name": "Yuki Tanaka",
        "preferred_name": "Yuki",
        "grade": "Grade 12",
        "delegation_name": "Riverside International School",
        "email": "yuki.tanaka@example.com",
        "delegate_experience": DelegateExperience.ADVANCED,
        "first_committee": "UN Women Summit",
        "second_committee": "Human Rights Council",
        "third_committee": "WHO Emergency Session",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "Friend",
        "notes": "Registered during the regular window.",
        "date_applied": datetime(2026, 8, 15, tzinfo=UTC),
    },
    {
        "first_name": "Chloe",
        "last_name": "Dubois",
        "full_name": "Chloe Dubois",
        "preferred_name": "Chloe",
        "grade": "Grade 9",
        "delegation_name": "Independent Delegate",
        "email": "chloe.dubois@example.com",
        "delegate_experience": DelegateExperience.NOVICE,
        "first_committee": "WHO Emergency Session",
        "second_committee": "Security Council",
        "third_committee": "Human Rights Council",
        "delegate_status": DelegateStatus.AWAITING_ASSIGNMENT,
        "financial_aid_status": FinancialAidStatus.YES,
        "financial_aid_reason": "Independent applicant, need-based aid requested.",
        "payment_policy_ack": True,
        "cancellation_policy_ack": True,
        "heard_about": "School announcement",
        "notes": "Registered during the regular window.",
        "date_applied": datetime(2026, 9, 10, tzinfo=UTC),
    },
]

# (delegate_email, committee_name, character_name, status once assigned)
ASSIGNMENTS = [
    ("lina.morales@example.com", "Security Council", "Kenya", DelegateStatus.ASSIGNED),
    (
        "owen.price@example.com",
        "WHO Emergency Session",
        "Nigeria",
        DelegateStatus.ASSIGNED,
    ),
    (
        "diego.ramirez@example.com",
        "WHO Emergency Session",
        "Brazil",
        DelegateStatus.CONFIRMED,
    ),
    (
        "marcus.chen@example.com",
        "Human Rights Council",
        "Norway",
        DelegateStatus.ASSIGNED,
    ),
    (
        "isabella.fontaine@example.com",
        "UN Women Summit",
        "Iceland",
        DelegateStatus.ASSIGNED,
    ),
    (
        "gabriel.silva@example.com",
        "Historical Crisis: Cuban Missile",
        "Adlai Stevenson",
        DelegateStatus.CONFIRMED,
    ),
    (
        "nadia.petrov@example.com",
        "Security Council",
        "United Kingdom",
        DelegateStatus.CONFIRMED,
    ),
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
        applied_at = payload_copy.pop("date_applied", None) or datetime.now(UTC)
        db.add(
            Delegate(
                **payload_copy,
                delegation_id=delegation_map.get(delegation_name),
                date_applied=applied_at,
                registration_period=_compute_registration_period(applied_at),
            )
        )


def seed_characters(db):
    committee_map = {row.name: row.id for row in db.scalars(select(Committee)).all()}
    existing = {
        (row.committee_id, row.name) for row in db.scalars(select(Character)).all()
    }
    for committee_name, entries in CHARACTERS.items():
        committee_id = committee_map.get(committee_name)
        if committee_id is None:
            continue
        for name, priority, experience in entries:
            if (committee_id, name) in existing:
                continue
            db.add(
                Character(
                    name=name,
                    committee_id=committee_id,
                    priority=priority,
                    experience=experience,
                )
            )


def seed_assignments(db):
    delegate_by_email = {row.email: row for row in db.scalars(select(Delegate)).all()}
    committee_id_by_name = {
        row.name: row.id for row in db.scalars(select(Committee)).all()
    }
    characters = db.scalars(select(Character)).all()

    for email, committee_name, character_name, final_status in ASSIGNMENTS:
        delegate = delegate_by_email.get(email)
        committee_id = committee_id_by_name.get(committee_name)
        if delegate is None or committee_id is None:
            continue
        character = next(
            (
                c
                for c in characters
                if c.committee_id == committee_id and c.name == character_name
            ),
            None,
        )
        if character is None or character.delegate_id is not None:
            continue
        character.delegate_id = delegate.id
        delegate.delegate_status = final_status


def main() -> None:
    db = SessionLocal()
    try:
        seed_email_templates(db)
        seed_committees(db)
        seed_delegations(db)
        db.commit()

        seed_characters(db)
        seed_delegates(db)
        db.commit()

        seed_assignments(db)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
