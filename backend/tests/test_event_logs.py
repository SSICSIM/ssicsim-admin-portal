from __future__ import annotations

from test_api import _make_character, _make_committee, _make_delegate

ACTOR_HEADERS = {"X-Actor-Email": "actor@example.com", "X-Actor-Name": "Ada Actor"}


def _logs(client):
    resp = client.get("/api/logs")
    assert resp.status_code == 200, resp.text
    return resp.json()


def _sec_members(client):
    resp = client.get("/api/sec-members")
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_status_change_creates_event_log_with_actor(client):
    delegate = _make_delegate(client, email="status1@example.com")

    resp = client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"delegate_status": "Assigned"},
        headers=ACTOR_HEADERS,
    )
    assert resp.status_code == 200, resp.text

    logs = _logs(client)
    assert len(logs) == 1
    log = logs[0]
    assert log["event_type"] == "Status Change"
    assert log["target_type"] == "Delegate"
    assert log["target_id"] == delegate["id"]
    assert "Awaiting Assignment" in log["details"]
    assert "Assigned" in log["details"]
    assert log["sec_member_id"] is not None

    members = _sec_members(client)
    assert any(m["email"] == "actor@example.com" for m in members)


def test_status_change_without_actor_logs_null_sec_member(client):
    delegate = _make_delegate(client, email="status2@example.com")

    resp = client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"delegate_status": "Assigned"},
    )
    assert resp.status_code == 200, resp.text

    logs = _logs(client)
    assert len(logs) == 1
    assert logs[0]["sec_member_id"] is None


def test_repeat_actor_reuses_sec_member(client):
    delegate = _make_delegate(client, email="status3@example.com")

    client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"delegate_status": "Assigned"},
        headers=ACTOR_HEADERS,
    )
    client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"delegate_status": "Confirmed"},
        headers=ACTOR_HEADERS,
    )

    members = [m for m in _sec_members(client) if m["email"] == "actor@example.com"]
    assert len(members) == 1

    logs = _logs(client)
    assert len(logs) == 2
    assert {log["sec_member_id"] for log in logs} == {members[0]["id"]}


def test_no_event_log_when_status_unchanged(client):
    delegate = _make_delegate(client, email="status4@example.com")

    resp = client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"grade": "Grade 12"},
        headers=ACTOR_HEADERS,
    )
    assert resp.status_code == 200, resp.text
    assert _logs(client) == []

    resp = client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"delegate_status": delegate["delegate_status"]},
        headers=ACTOR_HEADERS,
    )
    assert resp.status_code == 200, resp.text
    assert _logs(client) == []


def test_assignment_and_unassignment_create_event_logs(client):
    committee = _make_committee(client, "Crisis Cabinet")
    delegate = _make_delegate(client, email="assign1@example.com")
    character = _make_character(client, committee_id=committee["id"])

    assign_resp = client.post(
        "/api/assignments",
        json={"delegate_id": delegate["id"], "character_id": character["id"]},
        headers=ACTOR_HEADERS,
    )
    assert assign_resp.status_code == 201, assign_resp.text

    logs = _logs(client)
    assert len(logs) == 1
    assert logs[0]["event_type"] == "Assignment"
    assert committee["name"] in logs[0]["details"]

    unassign_resp = client.delete(
        f"/api/assignments/{delegate['id']}", headers=ACTOR_HEADERS
    )
    assert unassign_resp.status_code == 204, unassign_resp.text

    logs = _logs(client)
    event_types = {log["event_type"] for log in logs}
    assert "Unassignment" in event_types


def test_financial_aid_contacted_logs_event_once(client):
    delegate = _make_delegate(client, email="aid1@example.com")
    client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"financial_aid_status": "Yes"},
        headers=ACTOR_HEADERS,
    )
    assert _logs(client) == []  # setting status alone isn't "contacted"

    resp = client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"financial_aid_contacted": True},
        headers=ACTOR_HEADERS,
    )
    assert resp.status_code == 200, resp.text

    logs = _logs(client)
    assert len(logs) == 1
    assert logs[0]["event_type"] == "Financial Aid Contact"
    assert logs[0]["target_id"] == delegate["id"]

    # Saving again with contacted already true must not create a duplicate event
    resp = client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"financial_aid_contacted": True, "grade": "Grade 11"},
        headers=ACTOR_HEADERS,
    )
    assert resp.status_code == 200, resp.text
    assert len(_logs(client)) == 1


def test_actor_with_single_word_name_gets_valid_last_name(client):
    """Regression test: a name with no space (e.g. mock-login's email-local-part
    fallback) must not produce an empty last_name, which previously broke
    GET /api/sec-members (SecMemberOut requires last_name min_length=1)."""
    delegate = _make_delegate(client, email="status5@example.com")

    resp = client.patch(
        f"/api/delegates/{delegate['id']}",
        json={"delegate_status": "Assigned"},
        headers={
            "X-Actor-Email": "singleword@example.com",
            "X-Actor-Name": "singleword",
        },
    )
    assert resp.status_code == 200, resp.text

    members = _sec_members(client)
    actor = next(m for m in members if m["email"] == "singleword@example.com")
    assert actor["last_name"] != ""
