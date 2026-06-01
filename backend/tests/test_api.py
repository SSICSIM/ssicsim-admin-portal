from __future__ import annotations

from datetime import datetime, timezone
import uuid

import pytest


def _make_committee(client, name: str = "GA"):
    resp = client.post(
        "/api/committees",
        json={
            "name": name,
            "small_description": "desc",
            "large_description": "long",
            "director_name": "Director",
            "max_delegates": 10,
            "background_guide_link": None,
            "mechanics_guide_link": None,
            "character_guide_link": None,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _make_delegation(client, name: str = "Delegation A"):
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
            "delegate_experience": "Beginner",
            "first_committee": "C1",
            "second_committee": "C2",
            "third_committee": "C3",
            "date_applied": datetime(2024, 1, 1, tzinfo=timezone.utc).isoformat(),
            "delegate_status": "Awaiting Assignment",
            "delegation_id": delegation_id,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _make_character(client, committee_id: str, delegate_id: str | None = None):
    resp = client.post(
        "/api/characters",
        json={"committee_id": committee_id, "delegate_id": delegate_id},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_committees_unique_name(client):
    first = _make_committee(client, name="SOCHUM")
    assert first["name"] == "SOCHUM"

    conflict = client.post(
        "/api/committees",
        json={"name": "SOCHUM", "small_description": "d", "large_description": "l"},
    )
    assert conflict.status_code == 409
    assert "already exists" in conflict.json()["detail"]


def test_delegations_unique_name(client):
    _make_delegation(client, name="Team Alpha")
    conflict = client.post(
        "/api/delegations",
        json={
            "name": "Team Alpha",
            "faculty_advisor_first_name": "Bob",
            "faculty_advisor_last_name": "Smith",
            "faculty_advisor_email": "bob@example.com",
        },
    )
    assert conflict.status_code == 409
    assert "already exists" in conflict.json()["detail"]


def test_delegates_unique_email(client):
    _make_delegate(client, email="unique@example.com")
    conflict = client.post(
        "/api/delegates",
        json={
            "first_name": "Dup",
            "last_name": "User",
            "email": "unique@example.com",
            "delegate_experience": "Beginner",
            "first_committee": "X",
            "second_committee": "Y",
            "third_committee": "Z",
            "delegate_status": "Awaiting Assignment",
        },
    )
    assert conflict.status_code == 409
    assert "already exists" in conflict.json()["detail"]


def test_sec_members_unique_email(client):
    resp = client.post(
        "/api/sec-members",
        json={
            "first_name": "Sam",
            "last_name": "Sec",
            "email": "sam@example.com",
            "role": "Chair",
        },
    )
    assert resp.status_code == 201

    conflict = client.post(
        "/api/sec-members",
        json={
            "first_name": "Sue",
            "last_name": "Sec",
            "email": "sam@example.com",
            "role": "Director",
        },
    )
    assert conflict.status_code == 409
    assert "already exists" in conflict.json()["detail"]


def test_email_templates_unique_name(client):
    first = client.post(
        "/api/email-templates",
        json={
            "name": "Welcome",
            "subject_template": "Hi",
            "body_template": "Hello",
            "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc).isoformat(),
            "updated_at": datetime(2024, 1, 1, tzinfo=timezone.utc).isoformat(),
        },
    )
    assert first.status_code == 201

    conflict = client.post(
        "/api/email-templates",
        json={
            "name": "Welcome",
            "subject_template": "Hi",
            "body_template": "Hello 2",
            "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc).isoformat(),
            "updated_at": datetime(2024, 1, 1, tzinfo=timezone.utc).isoformat(),
        },
    )
    assert conflict.status_code == 409
    assert "already exists" in conflict.json()["detail"]


def test_characters_unique_constraints(client):
    committee = _make_committee(client, "DISEC")
    first = _make_character(client, committee_id=committee["id"])
    assert first["committee_id"] == committee["id"]

    dup_committee = client.post(
        "/api/characters", json={"committee_id": committee["id"], "delegate_id": None}
    )
    assert dup_committee.status_code == 409


def test_character_requires_committee_id(client):
    resp = client.post("/api/characters", json={"delegate_id": None})
    assert resp.status_code == 422


def test_committee_image_upload_local(client, tmp_path):
    committee = _make_committee(client, "Imageable")
    image_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 10
    resp = client.post(
        f"/api/committees/{committee['id']}/image",
        files={"file": ("test.png", image_bytes, "image/png")},
    )
    assert resp.status_code == 200, resp.text
    url = resp.json()["image_url"]
    assert "/uploads/" in url


def test_assignment_flow_and_conflicts(client):
    committee_a = _make_committee(client, "Crisis")
    committee_b = _make_committee(client, "Security")
    delegate = _make_delegate(client, email="assignee@example.com")
    character_a = _make_character(client, committee_id=committee_a["id"])
    character_b = _make_character(client, committee_id=committee_b["id"])

    assign = client.post(
        "/api/assignments",
        json={"delegate_id": delegate["id"], "character_id": character_a["id"]},
    )
    assert assign.status_code == 201, assign.text
    assert assign.json()["character_id"] == character_a["id"]

    duplicate_delegate = client.post(
        "/api/assignments",
        json={"delegate_id": delegate["id"], "character_id": character_b["id"]},
    )
    assert duplicate_delegate.status_code == 409

    move = client.patch(
        f"/api/assignments/{delegate['id']}",
        json={"character_id": character_b["id"]},
    )
    assert move.status_code == 200, move.text
    assert move.json()["character_id"] == character_b["id"]

    missing_character = client.post(
        "/api/assignments",
        json={"delegate_id": delegate["id"], "character_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert missing_character.status_code == 404
