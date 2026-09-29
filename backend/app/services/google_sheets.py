from __future__ import annotations

import base64
import json
import logging

import gspread

from app.config import settings
from app.models.delegate import Delegate

logger = logging.getLogger(__name__)

HEADER = [
    "Delegate ID",
    "First Name",
    "Last Name",
    "Full Name",
    "Preferred Name",
    "Grade",
    "Email",
    "Phone",
    "Delegate Experience",
    "First Committee",
    "Second Committee",
    "Third Committee",
    "Committee Selection Ack",
    "Date Applied",
    "Delegate Status",
    "Delegation ID",
    "Code of Conduct URL",
    "Code of Conduct Signed",
    "Payment Policy Ack",
    "Cancellation Policy Ack",
    "Financial Aid Status",
    "Financial Aid Reason",
    "Financial Aid Contacted",
    "Payment Receipt URL",
    "Heard About",
    "Notes",
]


def _get_worksheet() -> gspread.Worksheet:
    if not settings.google_service_account_json_b64 or not settings.google_sheet_id:
        raise RuntimeError(
            "GOOGLE_SERVICE_ACCOUNT_JSON_B64 or GOOGLE_SHEET_ID is not configured"
        )

    credentials_info = json.loads(
        base64.b64decode(settings.google_service_account_json_b64)
    )
    client = gspread.service_account_from_dict(credentials_info)
    spreadsheet = client.open_by_key(settings.google_sheet_id)
    return spreadsheet.worksheet(settings.google_sheet_worksheet)


def _delegate_row(delegate: Delegate) -> list:
    return [
        str(delegate.id),
        delegate.first_name,
        delegate.last_name,
        delegate.full_name,
        delegate.preferred_name,
        delegate.grade,
        delegate.email,
        delegate.phone,
        delegate.delegate_experience.value if delegate.delegate_experience else None,
        delegate.first_committee,
        delegate.second_committee,
        delegate.third_committee,
        delegate.committee_selection_ack,
        delegate.date_applied.isoformat() if delegate.date_applied else None,
        delegate.delegate_status.value if delegate.delegate_status else None,
        str(delegate.delegation_id) if delegate.delegation_id else None,
        delegate.code_of_conduct_url,
        delegate.code_of_conduct_signed,
        delegate.payment_policy_ack,
        delegate.cancellation_policy_ack,
        delegate.financial_aid_status.value if delegate.financial_aid_status else None,
        delegate.financial_aid_reason,
        delegate.financial_aid_contacted,
        delegate.payment_receipt_url,
        delegate.heard_about,
        delegate.notes,
    ]


def append_delegate_row(delegate: Delegate) -> None:
    worksheet = _get_worksheet()
    if not worksheet.row_values(1):
        worksheet.append_row(HEADER)
    worksheet.append_row(_delegate_row(delegate), value_input_option="USER_ENTERED")
