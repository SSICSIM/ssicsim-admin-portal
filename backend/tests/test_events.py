from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.models.event import Event

MC = "midnight-crisis"
SOCIAL = "delegate-social"
TRAINING = "delegate-training"

MC_ANSWERS = {
    "attendance_policy_ack": True,
    "attendance_mandatory_ack": True,
    "withdrawal_policy_ack": True,
    "withdrawal_notice_ack": True,
    "motivation": "I love chaos.",
}
SOCIAL_ANSWERS = {
    "allergies": ["None"],
    "dietary": ["Vegetarian"],
    "dietary_details": None,
    "withdrawal_policy_ack": True,
    "withdrawal_notice_ack": True,
}


@pytest.fixture()
def events(client, engine):
    """The migration seeds these rows; tests build tables with create_all."""
    with Session(engine) as db:
        db.add_all(
            [
                Event(slug=MC, name="Midnight Crisis", capacity=20, has_characters=True),
                Event(slug=SOCIAL, name="Delegate Social", capacity=120),
                Event(slug=TRAINING, name="Delegate Training", capacity=140),
            ]
        )
        db.commit()


def _set_event(engine, slug: str, **fields):
    with Session(engine) as db:
        event = db.query(Event).filter_by(slug=slug).one()
        for k, v in fields.items():
            setattr(event, k, v)
        db.commit()


def _make_delegate(
    client,
    email: str = "ada@example.com",
    first: str = "Ada",
    last: str = "Lovelace",
    status: str = "Awaiting Assignment",
    preferred: str | None = None,
):
    resp = client.post(
        "/api/delegates",
        json={
            "first_name": first,
            "last_name": last,
            "full_name": f"{first} {last}",
            "preferred_name": preferred,
            "email": email,
            "grade": "Grade 11",
            "delegate_experience": "Novice",
            "first_committee": "C1",
            "second_committee": "C2",
            "third_committee": "C3",
            "date_applied": datetime(2026, 9, 1, tzinfo=UTC).isoformat(),
            "delegate_status": status,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _register(client, slug, email="ada@example.com", first="Ada", last="Lovelace", answers=None):
    return client.post(
        f"/api/events/{slug}/register",
        json={
            "first_name": first,
            "last_name": last,
            "email": email,
            "answers": answers if answers is not None else SOCIAL_ANSWERS,
        },
    )


def test_unknown_email_rejected(client, events):
    resp = _register(client, SOCIAL, email="nobody@example.com")
    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "not_registered"
    assert "nobody@example.com" in resp.json()["detail"]["message"]


def test_waitlisted_delegate_rejected(client, events):
    _make_delegate(client, status="Waitlist")
    resp = _register(client, SOCIAL)
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "waitlisted"


def test_unpaid_delegate_allowed(client, events):
    _make_delegate(client, status="Awaiting Payment")
    resp = _register(client, SOCIAL)
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "Registered"


def test_email_is_case_insensitive(client, events):
    _make_delegate(client)
    resp = _register(client, SOCIAL, email="  ADA@Example.com ")
    assert resp.status_code == 201, resp.text


def test_name_mismatch_rejected(client, events):
    _make_delegate(client)
    resp = _register(client, SOCIAL, first="Grace", last="Hopper")
    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "name_mismatch"


def test_preferred_name_and_accents_match(client, events):
    _make_delegate(client, first="Zoë", last="Martín", preferred="Zo (she/her)")
    resp = _register(client, SOCIAL, first="zo", last="MARTIN")
    assert resp.status_code == 201, resp.text


def test_duplicate_registration_rejected(client, events):
    _make_delegate(client)
    assert _register(client, SOCIAL).status_code == 201
    resp = _register(client, SOCIAL)
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "already_registered"


def test_invalid_answers_rejected(client, events):
    _make_delegate(client)
    resp = _register(client, SOCIAL, answers={**SOCIAL_ANSWERS, "withdrawal_policy_ack": False})
    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "invalid_answers"

    long = {**MC_ANSWERS, "motivation": "word " * 101}
    resp = _register(client, MC, answers=long)
    assert resp.status_code == 422
    assert "100 words" in resp.json()["detail"]["message"]


def test_social_capacity_rolls_to_waitlist(client, events, engine):
    _set_event(engine, SOCIAL, capacity=1)
    _make_delegate(client, email="a@example.com", first="A", last="One")
    _make_delegate(client, email="b@example.com", first="B", last="Two")
    first = _register(client, SOCIAL, email="a@example.com", first="A", last="One")
    second = _register(client, SOCIAL, email="b@example.com", first="B", last="Two")
    assert first.json()["status"] == "Registered"
    assert second.json()["status"] == "Waitlist"

    event = client.get(f"/api/events/{SOCIAL}").json()
    assert event["filled"] == 1
    assert event["counts"] == {"Registered": 1, "Waitlist": 1}


def test_training_capacity_is_per_session(client, events, engine):
    _set_event(engine, TRAINING, capacity=1)
    people = [("a", "A", "One"), ("b", "B", "Two"), ("c", "C", "Three"), ("d", "D", "Four")]
    for key, first, last in people:
        _make_delegate(client, email=f"{key}@example.com", first=first, last=last)

    def reg(key, first, last, session):
        return _register(
            client,
            TRAINING,
            email=f"{key}@example.com",
            first=first,
            last=last,
            answers={"session": session},
        ).json()

    assert reg("a", "A", "One", "session_1")["status"] == "Registered"
    assert reg("b", "B", "Two", "session_1")["status"] == "Waitlist"
    second = reg("c", "C", "Three", "session_2")
    assert second["status"] == "Registered"
    assert second["session_label"].startswith("Session 2")
    # There's no online option.
    resp = _register(
        client, TRAINING, email="d@example.com", first="D", last="Four", answers={"session": "online"}
    )
    assert resp.status_code == 422

    sessions = {s["key"]: s for s in client.get(f"/api/events/{TRAINING}").json()["sessions"]}
    assert sessions["session_1"]["filled"] == 1
    assert set(sessions) == {"session_1", "session_2"}
    assert sessions["session_2"]["capacity"] == 1


def test_midnight_crisis_starts_pending(client, events):
    _make_delegate(client)
    resp = _register(client, MC, answers=MC_ANSWERS)
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "Pending"


def test_closed_and_past_deadline(client, events, engine):
    _make_delegate(client)
    _set_event(engine, SOCIAL, registration_open=False)
    resp = _register(client, SOCIAL)
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "registration_closed"

    _set_event(
        engine,
        SOCIAL,
        registration_open=True,
        registration_deadline=datetime.now(UTC) - timedelta(minutes=1),
    )
    resp = _register(client, SOCIAL)
    assert resp.json()["detail"]["code"] == "registration_closed"


def test_registration_list_embeds_delegate(client, events):
    delegate = _make_delegate(client)
    _register(client, SOCIAL)
    rows = client.get(f"/api/events/{SOCIAL}/registrations").json()
    assert len(rows) == 1
    assert rows[0]["delegate"]["id"] == delegate["id"]
    assert rows[0]["delegate"]["grade"] == "Grade 11"
    assert rows[0]["answers"]["dietary"] == ["Vegetarian"]

    # Edits to the delegate record show up on the registration.
    client.patch(f"/api/delegates/{delegate['id']}", json={"grade": "Grade 12"})
    rows = client.get(f"/api/events/{SOCIAL}/registrations").json()
    assert rows[0]["delegate"]["grade"] == "Grade 12"


def test_admin_add_update_delete_registration(client, events):
    delegate = _make_delegate(client, status="Waitlist")
    # Admin override skips the waitlist and name checks.
    resp = client.post(f"/api/events/{MC}/registrations", json={"delegate_id": delegate["id"]})
    assert resp.status_code == 201, resp.text
    reg = resp.json()
    assert reg["status"] == "Accepted"

    dup = client.post(f"/api/events/{MC}/registrations", json={"delegate_id": delegate["id"]})
    assert dup.status_code == 409

    resp = client.patch(f"/api/events/{MC}/registrations/{reg['id']}", json={"status": "Rejected"})
    assert resp.json()["status"] == "Rejected"

    resp = client.delete(f"/api/events/{MC}/registrations/{reg['id']}")
    assert resp.status_code == 204
    assert client.get(f"/api/events/{MC}/registrations").json() == []


def test_event_characters_and_assignment(client, events):
    a = _make_delegate(client, email="a@example.com", first="A", last="One")
    b = _make_delegate(client, email="b@example.com", first="B", last="Two")
    reg_a = client.post(f"/api/events/{MC}/registrations", json={"delegate_id": a["id"]}).json()
    reg_b = client.post(
        f"/api/events/{MC}/registrations", json={"delegate_id": b["id"], "status": "Pending"}
    ).json()
    social_reg = client.post(f"/api/events/{SOCIAL}/registrations", json={"delegate_id": a["id"]}).json()

    char = client.post(f"/api/events/{MC}/characters", json={"name": "The Mayor"}).json()
    other = client.post(f"/api/events/{MC}/characters", json={"name": "The Pirate"}).json()
    assert client.post(f"/api/events/{MC}/characters", json={"name": "The Mayor"}).status_code == 409
    # Social has no characters.
    assert client.get(f"/api/events/{SOCIAL}/characters").status_code == 400

    # Pending registrants can't be assigned; registrations from other events can't either.
    resp = client.post(
        f"/api/events/{MC}/characters/{char['id']}/assign", json={"registration_id": reg_b["id"]}
    )
    assert resp.status_code == 400
    resp = client.post(
        f"/api/events/{MC}/characters/{char['id']}/assign",
        json={"registration_id": social_reg["id"]},
    )
    assert resp.status_code == 404

    resp = client.post(
        f"/api/events/{MC}/characters/{char['id']}/assign", json={"registration_id": reg_a["id"]}
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["registration_id"] == reg_a["id"]

    # Reassigning to another character frees the first.
    client.post(
        f"/api/events/{MC}/characters/{other['id']}/assign", json={"registration_id": reg_a["id"]}
    )
    chars = {c["name"]: c for c in client.get(f"/api/events/{MC}/characters").json()}
    assert chars["The Mayor"]["registration_id"] is None
    assert chars["The Pirate"]["registration_id"] == reg_a["id"]

    rows = client.get(f"/api/events/{MC}/registrations").json()
    by_id = {r["id"]: r for r in rows}
    assert by_id[reg_a["id"]]["character"]["name"] == "The Pirate"

    # Rejecting a registrant releases their character.
    client.patch(f"/api/events/{MC}/registrations/{reg_a['id']}", json={"status": "Rejected"})
    chars = {c["name"]: c for c in client.get(f"/api/events/{MC}/characters").json()}
    assert chars["The Pirate"]["registration_id"] is None


def test_update_event(client, events):
    resp = client.patch(f"/api/events/{SOCIAL}", json={"registration_open": False, "capacity": 100})
    assert resp.status_code == 200, resp.text
    assert resp.json()["registration_open"] is False
    assert resp.json()["capacity"] == 100
    assert len(client.get("/api/events").json()) == 3


def test_midnight_crisis_has_no_waitlist(client, events):
    delegate = _make_delegate(client)
    resp = client.post(
        f"/api/events/{MC}/registrations", json={"delegate_id": delegate["id"], "status": "Waitlist"}
    )
    assert resp.status_code == 400

    reg = client.post(f"/api/events/{MC}/registrations", json={"delegate_id": delegate["id"]}).json()
    for status in ("Waitlist", "Registered"):
        resp = client.patch(f"/api/events/{MC}/registrations/{reg['id']}", json={"status": status})
        assert resp.status_code == 400
    resp = client.patch(f"/api/events/{MC}/registrations/{reg['id']}", json={"status": "Withdrawn"})
    assert resp.status_code == 200
