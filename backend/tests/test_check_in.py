from __future__ import annotations

import uuid
from datetime import UTC, datetime

ACTOR_HEADERS = {"X-Actor-Email": "actor@example.com", "X-Actor-Name": "Ada Actor"}


def _make_delegation(client, name: str = "Northview"):
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


def _make_delegate(
    client,
    email: str,
    first: str = "Ada",
    status: str = "Confirmed",
    delegation_id: str | None = None,
):
    resp = client.post(
        "/api/delegates",
        json={
            "first_name": first,
            "last_name": "Lovelace",
            "email": email,
            "delegate_experience": "Novice",
            "first_committee": "C1",
            "second_committee": "C2",
            "third_committee": "C3",
            "date_applied": datetime(2026, 9, 1, tzinfo=UTC).isoformat(),
            "delegate_status": status,
            "delegation_id": delegation_id,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _check_in_logs(client):
    logs = client.get("/api/logs", params={"event_type": "Check In"}).json()
    assert all(log["event_type"] == "Check In" for log in logs)
    return logs


def test_delegate_check_in_and_undo(client):
    delegate = _make_delegate(client, "ada@example.com")
    assert delegate["checked_in_at"] is None

    resp = client.post(
        f"/api/delegates/{delegate['id']}/check-in", headers=ACTOR_HEADERS
    )
    assert resp.status_code == 200, resp.text
    checked_in_at = resp.json()["checked_in_at"]
    assert checked_in_at is not None

    # Checking in again keeps the first time and doesn't log twice.
    again = client.post(f"/api/delegates/{delegate['id']}/check-in").json()
    assert again["checked_in_at"] == checked_in_at

    resp = client.delete(
        f"/api/delegates/{delegate['id']}/check-in", headers=ACTOR_HEADERS
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["checked_in_at"] is None

    logs = _check_in_logs(client)
    assert [log["details"] for log in logs] == [
        "Undid check-in of Ada Lovelace",
        "Checked in Ada Lovelace",
    ]
    assert all(log["sec_member_id"] for log in logs)
    assert all(log["target_type"] == "Delegate" for log in logs)


def test_delegation_check_in_checks_in_its_delegates(client):
    delegation = _make_delegation(client)
    early = _make_delegate(
        client, "early@example.com", "Early", delegation_id=delegation["id"]
    )
    early_at = client.post(f"/api/delegates/{early['id']}/check-in").json()[
        "checked_in_at"
    ]
    _make_delegate(client, "bo@example.com", "Bo", delegation_id=delegation["id"])
    _make_delegate(
        client,
        "pay@example.com",
        "Pay",
        status="Awaiting Payment",
        delegation_id=delegation["id"],
    )
    _make_delegate(
        client,
        "wait@example.com",
        "Wait",
        status="Waitlist",
        delegation_id=delegation["id"],
    )
    _make_delegate(client, "other@example.com", "Other")

    resp = client.post(
        f"/api/delegations/{delegation['id']}/check-in", headers=ACTOR_HEADERS
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["checked_in_at"] is not None

    by_first = {d["first_name"]: d for d in client.get("/api/delegates").json()}
    assert by_first["Early"]["checked_in_at"] == early_at
    assert by_first["Bo"]["checked_in_at"] is not None
    assert by_first["Wait"]["checked_in_at"] is None
    assert by_first["Pay"]["checked_in_at"] is not None
    assert by_first["Other"]["checked_in_at"] is None
    assert _check_in_logs(client)[0]["details"] == (
        "Checked in Northview with 2 delegates (1 had already checked in)"
    )

    # Undoing the delegation leaves its delegates checked in.
    resp = client.delete(f"/api/delegations/{delegation['id']}/check-in")
    assert resp.json()["checked_in_at"] is None
    by_first = {d["first_name"]: d for d in client.get("/api/delegates").json()}
    assert by_first["Bo"]["checked_in_at"] is not None


def test_check_in_unknown_delegate_is_404(client):
    resp = client.post(f"/api/delegates/{uuid.uuid4()}/check-in")
    assert resp.status_code == 404


def test_waitlisted_delegate_cannot_check_in(client):
    delegate = _make_delegate(client, "wait@example.com", status="Waitlist")

    resp = client.post(f"/api/delegates/{delegate['id']}/check-in")

    assert resp.status_code == 409
    assert _check_in_logs(client) == []


def test_moving_to_waitlist_clears_check_in(client):
    delegate = _make_delegate(client, "ada@example.com")
    client.post(f"/api/delegates/{delegate['id']}/check-in")

    resp = client.patch(
        f"/api/delegates/{delegate['id']}", json={"delegate_status": "Waitlist"}
    )

    assert resp.json()["checked_in_at"] is None
