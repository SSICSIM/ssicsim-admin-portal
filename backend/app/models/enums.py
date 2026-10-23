from __future__ import annotations

from enum import Enum


class DelegateExperience(str, Enum):
    NOVICE = "Novice"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"


class DelegateStatus(str, Enum):
    # Registered after capacity was reached; hasn't paid and holds no spot.
    WAITLIST = "Waitlist"
    AWAITING_PAYMENT = "Awaiting Payment"
    VERIFY_PAYMENT = "Verify Payment"
    AWAITING_ASSIGNMENT = "Awaiting Assignment"
    ASSIGNED = "Assigned"
    CONFIRMED = "Confirmed"


class FinancialAidStatus(str, Enum):
    YES = "Yes"
    NO = "No"
    DELEGATION_PAYING = "Delegation Paying"


class RegistrationPeriod(str, Enum):
    EARLY_BIRD = "Early Bird"
    REGULAR = "Regular"
    LATE = "Late"


class EventType(str, Enum):
    ASSIGNMENT = "Assignment"
    EMAIL = "Email"
    COMMITTEE_UPDATE = "Committee Update"
    STATUS_CHANGE = "Status Change"
    UNASSIGNMENT = "Unassignment"
    BATCH_EDIT = "Batch Edit"
    EVENT_REGISTRATION = "Event Registration"
    CHECK_IN = "Check In"


class CharacterExperience(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"


class EventRegistrationStatus(str, Enum):
    # Selective events (Midnight Crisis) start here until SEC accepts/rejects.
    PENDING = "Pending"
    REGISTERED = "Registered"
    # Signed up after the event (or training session) was full.
    WAITLIST = "Waitlist"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"
    WITHDRAWN = "Withdrawn"
