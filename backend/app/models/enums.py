from __future__ import annotations

from enum import Enum


class DelegateExperience(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    EXPERTISE = "Expertise"


class DelegateStatus(str, Enum):
    AWAITING_PAYMENT = "Awaiting Payment"
    AWAITING_ASSIGNMENT = "Awaiting Assignment"
    ASSIGNED = "Assigned"
    CONFIRMED = "Confirmed"


class EventType(str, Enum):
    ASSIGNMENT = "Assignment"
    EMAIL = "Email"
    COMMITTEE_UPDATE = "Committee Update"
