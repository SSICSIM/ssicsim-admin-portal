from __future__ import annotations

from test_api import _make_character, _make_committee, _make_delegate

ACTOR_HEADERS = {"X-Actor-Email": "actor@example.com", "X-Actor-Name": "Ada Actor"}


def _logs(client):
    resp = client.get("/api/logs")
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_character_priority_and_experience_round_trip(client):
    committee = _make_committee(client, "DISEC")
    resp = client.post(
        "/api/characters",
        json={
            "committee_id": committee["id"],
            "name": "France",
            "priority": 5,
            "experience": ["Advanced"],
        },
    )
    assert resp.status_code == 201, resp.text
    character = resp.json()
    assert character["priority"] == 5
    assert character["experience"] == ["Advanced"]

    update = client.patch(f"/api/characters/{character['id']}", json={"priority": 2})
    assert update.status_code == 200, update.text
    assert update.json()["priority"] == 2
    assert update.json()["experience"] == ["Advanced"]


def test_character_multiple_experience_levels(client):
    committee = _make_committee(client, "DISEC-2")
    resp = client.post(
        "/api/characters",
        json={
            "committee_id": committee["id"],
            "name": "Germany",
            "priority": 3,
            "experience": ["Beginner", "Advanced"],
        },
    )
    assert resp.status_code == 201, resp.text
    character = resp.json()
    assert set(character["experience"]) == {"Beginner", "Advanced"}

    cleared = client.patch(
        f"/api/characters/{character['id']}", json={"experience": []}
    )
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["experience"] == []


def test_bulk_edit_status_change_creates_batch_event_log(client):
    d1 = _make_delegate(client, email="bulk1@example.com")
    d2 = _make_delegate(client, email="bulk2@example.com")

    resp = client.post(
        "/api/delegates/bulk-edit",
        json={
            "items": [
                {"delegate_id": d1["id"], "delegate_status": "Confirmed"},
                {"delegate_id": d2["id"], "delegate_status": "Confirmed"},
            ]
        },
        headers=ACTOR_HEADERS,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["warnings"] == []
    assert len(body["updated"]) == 2
    assert all(d["delegate_status"] == "Confirmed" for d in body["updated"])
    batch_id = body["batch_id"]
    assert batch_id is not None

    logs = _logs(client)
    assert len(logs) == 3
    parent = next(log for log in logs if log["event_type"] == "Batch Edit")
    assert parent["target_type"] == "Batch"
    assert parent["batch_id"] == batch_id
    assert "2 delegate" in parent["details"]

    children = [log for log in logs if log["event_type"] == "Status Change"]
    assert len(children) == 2
    assert all(log["batch_id"] == batch_id for log in children)
    assert {log["target_id"] for log in children} == {d1["id"], d2["id"]}


def test_bulk_edit_assigns_character_with_batch_log(client):
    committee = _make_committee(client, "ECOFIN")
    character = _make_character(client, committee_id=committee["id"])
    delegate = _make_delegate(client, email="bulk3@example.com")

    resp = client.post(
        "/api/delegates/bulk-edit",
        json={
            "items": [{"delegate_id": delegate["id"], "character_id": character["id"]}]
        },
        headers=ACTOR_HEADERS,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["updated"][0]["delegate_status"] == "Assigned"

    char_resp = client.get(f"/api/characters/{character['id']}")
    assert char_resp.json()["delegate_id"] == delegate["id"]

    logs = _logs(client)
    assignment_logs = [log for log in logs if log["event_type"] == "Assignment"]
    assert len(assignment_logs) == 1
    assert assignment_logs[0]["batch_id"] == body["batch_id"]


def test_bulk_edit_confirmed_delegate_locked_until_unassigned(client):
    committee = _make_committee(client, "UNSC")
    character = _make_character(client, committee_id=committee["id"])
    delegate = _make_delegate(client, email="bulk4@example.com")

    client.post(
        "/api/assignments",
        json={"delegate_id": delegate["id"], "character_id": character["id"]},
    )
    client.patch(
        f"/api/delegates/{delegate['id']}", json={"delegate_status": "Confirmed"}
    )

    locked_resp = client.post(
        "/api/delegates/bulk-edit",
        json={
            "items": [
                {"delegate_id": delegate["id"], "delegate_status": "Awaiting Payment"}
            ]
        },
    )
    assert locked_resp.status_code == 200, locked_resp.text
    locked_body = locked_resp.json()
    assert locked_body["updated"] == []
    assert locked_body["batch_id"] is None
    assert any("Confirmed" in w for w in locked_body["warnings"])

    unassign_resp = client.post(
        "/api/delegates/bulk-edit",
        json={"items": [{"delegate_id": delegate["id"], "unassign": True}]},
    )
    assert unassign_resp.status_code == 200, unassign_resp.text
    unassigned_body = unassign_resp.json()
    assert unassigned_body["updated"][0]["delegate_status"] == "Awaiting Assignment"

    char_resp = client.get(f"/api/characters/{character['id']}")
    assert char_resp.json()["delegate_id"] is None


def test_bulk_edit_status_skipped_when_character_step_fails(client):
    committee = _make_committee(client, "SPECPOL")
    character = _make_character(client, committee_id=committee["id"])
    other_delegate = _make_delegate(client, email="bulk6a@example.com")
    delegate = _make_delegate(client, email="bulk6b@example.com")

    # Take the character with a different delegate first.
    client.post(
        "/api/assignments",
        json={"delegate_id": other_delegate["id"], "character_id": character["id"]},
    )

    resp = client.post(
        "/api/delegates/bulk-edit",
        json={
            "items": [
                {
                    "delegate_id": delegate["id"],
                    "character_id": character["id"],
                    "delegate_status": "Confirmed",
                }
            ]
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # Neither the character assignment nor the status change should have
    # applied — a delegate must never end up "Confirmed" with no character.
    assert body["updated"] == []
    assert body["batch_id"] is None
    assert any("already assigned" in w for w in body["warnings"])

    delegate_resp = client.get(f"/api/delegates/{delegate['id']}")
    assert delegate_resp.json()["delegate_status"] == "Awaiting Assignment"


def test_bulk_edit_reassignment_logs_unassignment_of_old_character(client):
    committee_a = _make_committee(client, "GA1")
    committee_b = _make_committee(client, "GA1-B")
    character_a = _make_character(client, committee_id=committee_a["id"])
    character_b = _make_character(client, committee_id=committee_b["id"])
    delegate = _make_delegate(client, email="bulk7@example.com")

    client.post(
        "/api/assignments",
        json={"delegate_id": delegate["id"], "character_id": character_a["id"]},
    )

    resp = client.post(
        "/api/delegates/bulk-edit",
        json={
            "items": [
                {"delegate_id": delegate["id"], "character_id": character_b["id"]}
            ]
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["updated"][0]["delegate_status"] == "Assigned"

    char_a_resp = client.get(f"/api/characters/{character_a['id']}")
    assert char_a_resp.json()["delegate_id"] is None
    char_b_resp = client.get(f"/api/characters/{character_b['id']}")
    assert char_b_resp.json()["delegate_id"] == delegate["id"]

    logs = _logs(client)
    unassignment_logs = [log for log in logs if log["event_type"] == "Unassignment"]
    assignment_logs = [log for log in logs if log["event_type"] == "Assignment"]
    assert len(unassignment_logs) == 1
    assert len(assignment_logs) == 2  # the original assign to A, plus the reassign to B
    assert unassignment_logs[0]["batch_id"] == body["batch_id"]


def test_bulk_edit_status_log_uses_true_prior_status(client):
    committee = _make_committee(client, "GA2")
    character = _make_character(client, committee_id=committee["id"])
    delegate = _make_delegate(client, email="bulk8@example.com")
    assert delegate["delegate_status"] == "Awaiting Assignment"

    resp = client.post(
        "/api/delegates/bulk-edit",
        json={
            "items": [
                {
                    "delegate_id": delegate["id"],
                    "character_id": character["id"],
                    "delegate_status": "Confirmed",
                }
            ]
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["updated"][0]["delegate_status"] == "Confirmed"

    logs = _logs(client)
    status_change = next(log for log in logs if log["event_type"] == "Status Change")
    # Must read "Awaiting Assignment → Confirmed", not "Assigned → Confirmed"
    # (the transient status the character-assignment step set moments earlier).
    assert "Awaiting Assignment" in status_change["details"]
    assert "Confirmed" in status_change["details"]
    assert "Assigned →" not in status_change["details"]


def test_bulk_edit_no_effective_changes_returns_empty(client):
    delegate = _make_delegate(client, email="bulk5@example.com")

    resp = client.post(
        "/api/delegates/bulk-edit",
        json={
            "items": [
                {
                    "delegate_id": delegate["id"],
                    "delegate_status": delegate["delegate_status"],
                }
            ]
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["updated"] == []
    assert body["batch_id"] is None
    assert _logs(client) == []
