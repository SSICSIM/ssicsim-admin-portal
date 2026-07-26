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


class EventType(str, Enum):
    ASSIGNMENT = "Assignment"
    EMAIL = "Email"
    COMMITTEE_UPDATE = "Committee Update"
    STATUS_CHANGE = "Status Change"
    UNASSIGNMENT = "Unassignment"


class ApplicantStatus(str, Enum):
    APPLIED = "Applied"
    INTERVIEW_TIMES_SENT = "Interview Times Sent"
    INTERVIEW_TIMES_CONFIRMED = "Interview Times Confirmed"
    INTERVIEW_CONFIRMED = "Interview Confirmed"
    INTERVIEW_CONCLUDED = "Interview Concluded"
    INTERVIEW_RESCHEDULED = "Interview Rescheduled"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"
    OFFERED = "Offered"
    CONFIRMED = "Confirmed"
    WITHDRAWN = "Withdrawn"

