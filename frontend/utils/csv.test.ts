// Run with `npm test` (Node's built-in test runner; needs Node 22.18+ for .ts support).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CharacterOut, CommitteeOut, DelegateOut, DelegationOut } from "@/types/api";

import {
  buildCommitteeCharacterRows,
  buildDelegationRows,
  buildFinancialRows,
  buildFullDelegateRows,
  projectedDelegateCount
} from "./csv.ts";

function delegate(overrides: Partial<DelegateOut>): DelegateOut {
  return {
    id: "d-default",
    first_name: "First",
    last_name: "Last",
    full_name: null,
    preferred_name: null,
    grade: null,
    email: "x@example.com",
    phone: null,
    delegate_experience: "Novice",
    first_committee: null,
    second_committee: null,
    third_committee: null,
    committee_selection_ack: null,
    date_applied: null,
    registration_period: null,
    delegate_status: "Awaiting Assignment",
    delegation_id: null,
    code_of_conduct_url: null,
    code_of_conduct_signed: null,
    payment_policy_ack: null,
    cancellation_policy_ack: null,
    financial_aid_status: null,
    financial_aid_reason: null,
    financial_aid_contacted: null,
    payment_receipt_url: null,
    heard_about: null,
    notes: null,
    ...overrides
  };
}

function delegation(overrides: Partial<DelegationOut>): DelegationOut {
  return {
    id: "g-default",
    name: "Delegation",
    faculty_advisor_first_name: null,
    faculty_advisor_last_name: null,
    faculty_advisor_email: null,
    contact_role: null,
    contact_phone: null,
    school_address: null,
    delegation_size: null,
    delegation_size_min: null,
    delegation_size_max: null,
    attended_before: null,
    payment_process: null,
    policy_ack_registration: null,
    policy_ack_payment: null,
    policy_ack_cancellation: null,
    policy_ack_conduct: null,
    policy_ack_photography: null,
    heard_about: null,
    notes: null,
    head_delegate_id: null,
    ...overrides
  };
}

const school = delegation({
  id: "g1",
  name: "School A",
  faculty_advisor_first_name: "Ann",
  faculty_advisor_last_name: "Lee",
  delegation_size: 5,
  head_delegate_id: "d1",
  attended_before: true
});
const empty = delegation({ id: "g2", name: "Another School", delegation_size: null });

const alice = delegate({
  id: "d1",
  first_name: "Alice",
  last_name: "Smith",
  delegation_id: "g1",
  registration_period: "Regular",
  delegate_status: "Confirmed",
  date_applied: "2026-09-01T15:30:00"
});
const bob = delegate({
  id: "d2",
  first_name: "Bob",
  last_name: "Jones",
  delegation_id: "g1",
  registration_period: "Early Bird",
  delegate_status: "Awaiting Payment"
});
const indie = delegate({
  id: "d3",
  first_name: "Ivy",
  last_name: "Indie",
  registration_period: "Late",
  delegate_status: "Assigned"
});

// On the waitlist: must never show up in roster, financial or delegation counts.
const waitlister = delegate({
  id: "d4",
  first_name: "Wendy",
  last_name: "Wait",
  delegation_id: "g1",
  registration_period: "Late",
  delegate_status: "Waitlist"
});
const waitlisterIndie = delegate({
  id: "d5",
  first_name: "Walt",
  last_name: "Wait",
  registration_period: "Late",
  delegate_status: "Waitlist"
});

const committee = { id: "c1", name: "JCC Rome" } as CommitteeOut;
const napoleon = {
  id: "ch1",
  name: "Napoleon",
  committee_id: "c1",
  delegate_id: "d1"
} as CharacterOut;

function asObjects({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return rows.map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
}

describe("buildFullDelegateRows", () => {
  const result = buildFullDelegateRows(
    [alice, bob, indie],
    [napoleon],
    new Map([[committee.id, committee]]),
    new Map([[school.id, school]])
  );
  const [a, b, i] = asObjects(result);

  it("keeps the original master-sheet columns first, in order", () => {
    assert.deepEqual(result.headers.slice(0, 3), ["id", "first_name", "last_name"]);
    assert.equal(result.headers[15], "delegation");
    assert.equal(result.headers[24], "notes");
    assert.deepEqual(result.headers.slice(25), [
      "date_applied",
      "price",
      "payment_status",
      "assigned_committee",
      "assigned_character"
    ]);
  });

  it("has one cell per header in every row", () => {
    for (const row of result.rows) assert.equal(row.length, result.headers.length);
  });

  it("includes registration time, price, payment and assignment", () => {
    assert.equal(a.date_applied, "2026-09-01 15:30");
    assert.equal(a.price, 90);
    assert.equal(a.payment_status, "Paid");
    assert.equal(a.assigned_committee, "JCC Rome");
    assert.equal(a.assigned_character, "Napoleon");
    assert.equal(a.delegation, "School A");
  });

  it("leaves unassigned / unknown fields blank", () => {
    assert.equal(b.price, 70);
    assert.equal(b.payment_status, "Not yet paid");
    assert.equal(b.date_applied, "");
    assert.equal(b.assigned_committee, "");
    assert.equal(b.assigned_character, "");
    assert.equal(i.delegation, "");
    assert.equal(i.price, 110);
  });
});

describe("buildDelegationRows", () => {
  const result = buildDelegationRows([school, empty], [alice, bob, indie]);
  const rows = asObjects(result);

  it("sorts delegations by name and ends with Independent Delegates", () => {
    assert.deepEqual(
      rows.map((r) => r.delegation),
      ["Another School", "School A", "Independent Delegates"]
    );
  });

  it("computes registered, remaining slots and total price", () => {
    const a = rows[1];
    assert.equal(a.faculty_advisor_name, "Ann Lee");
    assert.equal(a.delegation_size, 5);
    assert.equal(a.registered_delegates, 2);
    assert.equal(a.remaining_slots, 3);
    assert.equal(a.total_price, 160);
    assert.equal(a.head_delegate, "Alice Smith");
    assert.equal(a.attended_before, "Yes");
  });

  it("handles delegations with no stated size or delegates", () => {
    assert.equal(rows[0].registered_delegates, 0);
    assert.equal(rows[0].remaining_slots, "");
    assert.equal(rows[0].total_price, 0);
  });

  it("summarises independent delegates", () => {
    assert.equal(rows[2].registered_delegates, 1);
    assert.equal(rows[2].total_price, 110);
  });

  it("leaves waitlisted delegates out of counts and totals", () => {
    const withWaitlist = asObjects(
      buildDelegationRows([school, empty], [alice, bob, indie, waitlister, waitlisterIndie])
    );
    assert.deepEqual(withWaitlist, rows);
  });
});

describe("buildFinancialRows", () => {
  it("leaves waitlisted delegates out", () => {
    const result = buildFinancialRows(
      [alice, bob, indie, waitlister, waitlisterIndie],
      new Map([[school.id, school]])
    );
    const names = asObjects(result).map((r) => r.delegate);
    assert.equal(names.length, 3);
    assert.ok(!names.some((n) => String(n).includes("Wait")));
  });
});

describe("projectedDelegateCount", () => {
  it("sums stated sizes plus independent delegates", () => {
    assert.deepEqual(projectedDelegateCount([school, empty], [alice, bob, indie]), {
      registered: 3,
      projected: 6,
      waitlisted: 0
    });
  });

  it("leaves waitlisted delegates out of registered and projected counts", () => {
    const waitlisted = delegate({ id: "w1", delegate_status: "Waitlist" });
    assert.deepEqual(projectedDelegateCount([school, empty], [alice, bob, indie, waitlisted]), {
      registered: 3,
      projected: 6,
      waitlisted: 1
    });
  });

  it("uses the registered count when a delegation exceeds its stated size", () => {
    const small = delegation({ id: "g1", delegation_size: 1 });
    assert.deepEqual(projectedDelegateCount([small], [alice, bob]), {
      registered: 2,
      projected: 2,
      waitlisted: 0
    });
  });
});

describe("buildCommitteeCharacterRows", () => {
  function character(id: string, name: string, overrides: Partial<CharacterOut> = {}) {
    return {
      id,
      name,
      committee_id: "c1",
      delegate_id: null,
      priority: null,
      experience: [],
      ...overrides
    } as CharacterOut;
  }

  it("exports name, priority and experience for a regular committee", () => {
    const result = buildCommitteeCharacterRows(committee, [
      character("a", "Caesar", { priority: 2, experience: ["Beginner", "Advanced"] }),
      character("b", "Brutus", { priority: 5 }),
      character("x", "Other committee", { committee_id: "c2" })
    ]);
    assert.deepEqual(result.headers, ["character_name", "priority", "experience"]);
    assert.deepEqual(result.rows, [
      ["Brutus", 5, ""],
      ["Caesar", 2, "Beginner;Advanced"]
    ]);
  });

  it("moves the bracketed side into jcc_committee when every character has one", () => {
    const result = buildCommitteeCharacterRows(committee, [
      character("a", "Pompey (Senate)", { priority: 3 }),
      character("b", "Caesar (Legions)", { priority: 5 }),
      character("c", "Cato (Senate)", { priority: 5 })
    ]);
    assert.deepEqual(result.headers, ["character_name", "priority", "experience", "jcc_committee"]);
    assert.deepEqual(result.rows, [
      ["Caesar", 5, "", "Legions"],
      ["Cato", 5, "", "Senate"],
      ["Pompey", 3, "", "Senate"]
    ]);
  });

  it("keeps brackets in the name when only some characters have them", () => {
    const result = buildCommitteeCharacterRows(committee, [
      character("a", "Matt (Mail Jeevas)"),
      character("b", "Near")
    ]);
    assert.deepEqual(result.headers, ["character_name", "priority", "experience"]);
    assert.deepEqual(
      result.rows.map((r) => r[0]),
      ["Matt (Mail Jeevas)", "Near"]
    );
  });
});
