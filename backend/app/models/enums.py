from __future__ import annotations

from enum import Enum


class DelegateExperience(str, Enum):
    NOVICE = "Novice"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"


class DelegateStatus(str, Enum):
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
