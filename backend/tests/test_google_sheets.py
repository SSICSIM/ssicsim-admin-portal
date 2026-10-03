from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest

from app.config import settings
from app.services import google_sheets


def _make_delegation(client, name: str):
    resp = client.post(
        "/api/delegations",
        json={
            "name": name,
            "faculty_advisor_first_name": "Ann",
            "faculty_advisor_last_name": "Lee",
            "faculty_advisor_email": "ann@example.com",
            "head_delegate_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _make_delegate(client, email: str = "delegate@example.com", delegation_id=None):
    resp = client.post(
        "/api/delegates",
        json={
            "first_name": "Del",
            "last_name": "Egate",
            "email": email,
            "delegate_experience": "Novice",
            "first_committee": "C1",
            "second_committee": "C2",
            "third_committee": "C3",
            "date_applied": datetime(2024, 1, 1, tzinfo=UTC).isoformat(),
            "delegate_status": "Awaiting Assignment",
            "delegation_id": delegation_id,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


class FakeWorksheet:
    def __init__(self, rows: list[list] | None = None):
        self.rows = rows or []

    def row_values(self, index: int) -> list:
        return self.rows[index - 1] if len(self.rows) >= index else []

    def append_row(self, row: list, value_input_option: str | None = None) -> None:
        self.rows.append(row)


@pytest.fixture()
def worksheet(monkeypatch):
    sheet = FakeWorksheet()
    monkeypatch.setattr(google_sheets, "_get_worksheet", lambda: sheet)
    return sheet


def _column(row: list, header: str):
    return row[google_sheets.HEADER.index(header)]


def test_new_delegate_is_appended_with_header(client, worksheet):
    delegation = _make_delegation(client, name="Team Alpha")
    delegate = _make_delegate(client, delegation_id=delegation["id"])

    assert worksheet.rows[0] == google_sheets.HEADER
    assert len(worksheet.rows) == 2
    row = worksheet.rows[1]
    assert len(row) == len(google_sheets.HEADER)
    assert _column(row, "Delegate ID") == delegate["id"]
    assert _column(row, "Email") == delegate["email"]
    assert _column(row, "Delegation") == "Team Alpha"
    assert _column(row, "Registration Period") == delegate["registration_period"]
    assert _column(row, "Delegate Status") == "Awaiting Assignment"


def test_header_is_not_duplicated(client, worksheet):
    _make_delegate(client, email="one@example.com")
    _make_delegate(client, email="two@example.com")

    assert [r for r in worksheet.rows if r == google_sheets.HEADER] == [
        google_sheets.HEADER
    ]
    assert len(worksheet.rows) == 3


def test_independent_delegate_is_labelled(client, worksheet):
    _make_delegate(client)

    assert _column(worksheet.rows[1], "Delegation") == "Independent Delegate"


def test_waitlisted_delegate_is_synced_only_once_moved_off_waitlist(client, worksheet):
    resp = client.post(
        "/api/delegates",
        json={
            "first_name": "Wait",
            "last_name": "Listed",
            "email": "waitlist@example.com",
            "delegate_experience": "Novice",
            "first_committee": "C1",
            "second_committee": "C2",
            "third_committee": "C3",
            "delegate_status": "Waitlist",
        },
    )
    assert resp.status_code == 201, resp.text
    assert worksheet.rows == []

    moved = client.patch(
        f"/api/delegates/{resp.json()['id']}",
        json={"delegate_status": "Awaiting Payment"},
    )
    assert moved.status_code == 200, moved.text
    assert len(worksheet.rows) == 2
    assert _column(worksheet.rows[1], "Email") == "waitlist@example.com"
    assert _column(worksheet.rows[1], "Delegate Status") == "Awaiting Payment"


def test_sync_failure_does_not_block_registration(client, monkeypatch):
    def boom():
        raise ConnectionError("Google is down")

    monkeypatch.setattr(google_sheets, "_get_worksheet", boom)

    delegate = _make_delegate(client)
    assert client.get(f"/api/delegates/{delegate['id']}").status_code == 200


def test_unconfigured_sync_does_not_block_registration(client, monkeypatch):
    monkeypatch.setattr(settings, "google_service_account_json_b64", None)
    monkeypatch.setattr(settings, "google_sheet_id", None)

    _make_delegate(client)
