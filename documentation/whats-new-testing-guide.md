# What's New — Testing Guide

This covers the features added on `character-assignment-prep`: character
priority/experience, CSV exports, delegation financial/assignment views,
delegate filters, the new full-page assignment flow, committee fill charts,
and the inline "Edit table" bulk-edit mode. Use this to manually walk through
everything before merging.

## Before you start

A new migration adds `characters.priority`, `characters.experience`, and
`event_logs.batch_id`. You don't need to run it by hand — the `backend`
service in `docker-compose.yml` already runs `alembic upgrade heads`
automatically on every startup, before `uvicorn` starts. Just:

```bash
docker-compose up --build
```

and sign in to the admin portal once it's up.

If you ever do need to run an alembic command manually (e.g. to check the
current revision), run it **inside** the backend container, not from your
host shell — `DATABASE_URL` in `.env` points at hostname `db`, which only
resolves inside the Compose network:

```bash
docker compose exec backend alembic current   # if the stack is already up
docker compose run --rm backend alembic upgrade head   # one-off container
```

Running bare `alembic ...` from your Mac terminal will fail with
`could not translate host name "db"`.

If `docker-compose up` fails with `port is already allocated` on 5432,
another Postgres container (from a different project) already has that port.
Find it with `docker ps --format '{{.Names}}\t{{.Ports}}' | grep 5432` and
either stop it (`docker stop <name>`, safe/reversible — restart later with
`docker start <name>`) or remap this project's `db` port via a local
`docker-compose.override.yml` if you need both running at once.

You'll need at least:
- One committee with a few characters (some with priority/experience set, some without)
- A handful of delegates in different statuses (Awaiting Assignment, Assigned, Confirmed)
- At least one delegate belonging to a delegation (not "Independent Delegate")

**Fastest way to get all of that**: `backend/scripts/seed_data.py` now seeds 5
committees, 30 characters (with priority/experience set, spread across all
three tiers and experience levels), 7 delegations, and 23 delegates covering
every `delegate_status` (including 4 Assigned and 3 Confirmed with real
character assignments already made), every `financial_aid_status`, and all
three registration periods. Run it once the stack is up:

```bash
docker compose exec backend python scripts/seed_data.py
```

It's idempotent (skips rows that already exist by name/email), so it's safe
to re-run.

A ready-to-upload character matrix CSV is at
`documentation/samples/characters_sample.csv` — it uses country names that
don't collide with any seeded committee's characters, so you can upload it to
any of the 5 seeded committees to test the CSV import path without hitting a
duplicate-name conflict. It also includes two rows with a blank `priority`
and/or `experience`, and two rows with multiple semicolon-separated
experience levels, to exercise both the optional-column and multi-value
paths.

---

## 1. Character priority & experience

**Where:** `/committees/[id]/edit` → "Characters & Assignments" card.

- Add a character manually using the "Add character" row — it now has a
  **Priority** (1-5) number field and three **Experience** checkboxes
  (Beginner/Intermediate/Advanced, check any that apply — a character can
  suit more than one level) alongside the name. Leave them blank to confirm
  optional fields still work.
- Each character in the list now shows `Name (P{priority} · {experience})`,
  e.g. `France (P4 · Advanced)`, `Germany (P3 · Beginner/Advanced)` for a
  character with two levels, or `France (P– · –)` if unset.

### CSV matrix upload format

Still uploaded from the same card ("Character Matrix CSV"). Columns are
matched **by header name, not position** — order never matters, columns can
be omitted, and headers are case-insensitive. Only `character_name` is
required:

| Column | Required | Values |
|---|---|---|
| `character_name` | Yes | Any text |
| `priority` | No | Integer `1`–`5` (5 = highest priority) |
| `experience` | No | Any of `Beginner`, `Intermediate`, `Advanced` (case-insensitive), **semicolon-separated** if more than one applies, e.g. `Beginner; Advanced` |

A character can suit more than one experience level, so unlike every other
column, `experience` accepts a list in one cell — split on `;`, not `,`
(commas are already the field delimiter). Each semicolon-separated token is
validated independently: a bad token (a typo, a 4th level like `Expert`) is
dropped with a per-token warning while the rest of that row's valid levels
still import. The same "drop the value, warn, keep the row" behavior applies
to an out-of-range `priority` (e.g. `0`, `7`,
`"high"`). Only a missing `character_name` skips a row entirely.

Example `characters.csv`:

```csv
character_name,priority,experience
France,5,Advanced
Germany,3,Beginner; Advanced
Brazil,1,Beginner
Japan,4,Advanced
Kenya,,
```

Notes:
- The parser is a plain comma split with no quoting support — **don't put a
  comma inside any cell**, including a character name (e.g. `France,
  Republic of`). That adds an extra cell and misaligns every column after it
  for that row. Multiple experience levels are fine as long as you use `;`
  (semicolon), not `,`, to separate them within the one `experience` cell —
  see above.
- An out-of-range priority (e.g. `7`) or an unrecognized experience token
  (e.g. `"Expert"`) doesn't fail the whole upload — that one bad value is
  dropped and a warning banner lists exactly which row/character/value was
  skipped, with the character still created (just missing that field, or
  missing just the bad token if the rest of a multi-value `experience` cell
  was valid).
- Test this: upload a CSV with one bad `priority`, one bad `experience`
  token, and one multi-value `experience` cell mixed in with good rows, and
  confirm the warning banner names the two bad ones while the multi-value row
  imports both levels correctly.

Wherever a character can be picked (the single Assign/Reassign dialog, the
new `/assignments` flow, and the row-level Character dropdown in "Edit
table" mode), it's now labeled the same way: `Name (P{priority} · {experience})`,
and the option list is always sorted **highest priority first** (P5 → P1,
unset last) so the most urgent open seats surface at the top instead of
requiring a scroll.

The "Characters & Assignments" list on this page also has **Filter by
priority** and **Filter by experience** dropdowns above it — test filtering
to a single priority (e.g. P5 only) and a single experience level, and
confirm the "no characters match the selected filters" message appears when
the combination matches nothing (vs. "No characters yet." when the committee
truly has none).

---

## 2. Delegates tab filters

**Where:** `/delegates`, filter row above the table.

Committee filter already existed; **Delegation** and **Financial Aid**
dropdowns are new, sitting next to it. Test:
- Filter by a specific delegation → only that delegation's delegates show.
- Filter by Financial Aid = Yes / No / Delegation Paying.
- Combine two filters (e.g. Committee + Financial Aid) and confirm they AND
  together, not OR.
- Confirm the "X of Y shown" count in the card description updates.

---

## 3. CSV exports

Three separate export surfaces:

**a) Full delegate export** — "Export CSV" button above the delegates table
(unchanged from before, just refactored internally).

**b) Per-delegation exports** — open any delegation's row via "Edit" on the
Delegations table (bottom of `/delegates`). The dialog now has three tabs:
- **Overview** — the existing edit form.
- **Financial** — a read-only table of that delegation's delegates
  (registration period, price, financial aid status, and a derived "Paid /
  Not yet paid / Delegation pays" column) with its own **Export CSV** button.
- **Character Assignments** — a read-only table of that delegation's
  finalized committee/character assignments, also with **Export CSV**.

  Test: open the CSV file for each and confirm it only contains that one
  delegation's delegates.

**c) Export all** — on the Delegations section header (`/delegates`, bottom
card), "Export all financial (CSV)" and "Export all assignments (CSV)"
buttons produce the same two report shapes but across every delegation,
sorted/grouped by delegation name.

Pricing is currently **hardcoded**: Early Bird = $70, Regular = $90, Late =
$110 (see `frontend/utils/csv.ts` → `REGISTRATION_PRICES` if these need to
change before the real event).

---

## 4. Assignment flow (now a full page)

**Where:** `/delegates` → "Assignment flow" button (top of the filter row) →
now navigates to `/assignments` instead of opening a modal.

- The queue of delegates still "Awaiting Assignment" is sorted by **earliest
  registration first** (`date_applied` ascending; delegates with no recorded
  date sort last) — the "N of M remaining" badge at the top tracks position
  in this queue, not a delegate-by-delegate stepper.
- The left sidebar is **every committee's live fill status**, not a list of
  delegates — scroll it to see them all. Each row shows:
  - `filled/total` and, below that, how many characters are **left to fill**
    per tier — `L {n} left`, `M {n} left`, `H {n} left`, and a bold total
    left — instead of percentages, so it reads as an actionable count (e.g.
    "H 2 left" tells you exactly how many high-priority seats are still
    open).
  - Beginner/Intermediate/Advanced **availability counts** (unassigned
    characters suited to that level — a character with multiple levels
    counts toward each).
  - The active delegate's preferred committees (their first/second/third
    choice, matched by name) are ranked to the **top** of the list with a
    "1st pick"/"2nd pick"/"3rd pick" tag, so you don't have to hunt for them
    while scrolling.
- Click a committee row to select it — the Character dropdown below then
  fills with that committee's open characters, **highest priority first**
  (P5 → P1).
- "Assign & next" assigns the current delegate; the queue automatically
  shrinks (the assigned delegate drops off) — no manual advance needed.
- "Back" steps to the previous delegate still in the queue.
- When the queue is empty, you should see an "All caught up" state instead
  of a form.

Test this: pick a delegate, confirm their 1st-choice committee (if it
exists) is pinned at the top of the sidebar with a "1st pick" tag; assign
them into a committee and confirm that committee's "left" counts and
availability counts both decrement immediately.

---

## 5. Committee fill charts

**Where:** `/committees`, each committee card, below "Open full details".

- Below "Characters" there's now an **"Assigned: X of Y"** row.
- A ring chart with three nested arcs (outer = High priority, middle =
  Medium, inner = Low), colored differently, plus the overall fill % in the
  center and a text legend to the side.
- A tier with **no characters in it** renders as a plain gray track (no
  colored arc) and its legend shows "—" instead of a percentage — this
  matters because an unset priority matrix would otherwise compute every
  tier as a misleadingly confident 100%. The center number itself only
  shows "--" when the committee has **zero characters total**; otherwise it
  shows the real overall fill %, independent of whether priorities are set.
- Test: assign characters in a committee with a mix of priorities and
  confirm the corresponding ring segment grows and the legend percentage
  updates after a refetch. Then test a committee where characters exist but
  none have a priority set — all three tier rings should show as gray/"—",
  not a solid 100%.

---

## 6. Inline "Edit table" bulk editing

**Where:** `/delegates` → "Edit table" button (top-right of the Delegates
card, next to Export CSV).

1. Click **Edit table** — Status, Committee, and Character columns become
   dropdowns for every row.
2. For a delegate that's **Confirmed**, those dropdowns should be disabled
   and replaced with an **"Unassign to edit"** button instead. Click it —
   the row should unlock (dropdowns become editable) without actually
   hitting the server yet.
3. Change a handful of rows' statuses, and reassign a character on at least
   one Assigned/Awaiting Assignment row (pick a Committee, then a
   Character — the Character dropdown is disabled until a committee is
   picked).
4. Click **"Save changes (N)"** (or **"Exit edit mode"**, which should
   trigger the same prompt if there are unsaved edits) — a confirm dialog
   lists every changed delegate with an old → new line per field.
   - Test the per-row **✕** revert button — it should drop just that one
     row's pending change from the list.
   - Test **"Discard all & exit"** — leaves edit mode with nothing saved.
   - Test **"Keep editing"** — closes the dialog, returns to edit mode with
     pending edits intact.
5. Click **"Confirm changes"** — edits should apply, the table refreshes,
   and edit mode exits automatically.
6. Go to `/activity` — you should see **one** "Batch Edit" row summarizing
   the save (e.g. "X changed 4 delegates"), collapsed by default. Click it
   to expand and see one sub-row per individual change (Status
   Change/Assignment/Unassignment), indented, each with its own timestamp
   and actor.

Edge case worth checking: try to change a Confirmed delegate's status
*without* clicking "Unassign to edit" first — the dropdown should be
disabled, so this shouldn't be reachable from the UI at all.

---

## Known limitations

- Registration pricing is hardcoded (see §3), not pulled from any settings UI.
- The delegation "view" is the existing Edit dialog with tabs added, not a
  separate page — there's no `/delegations/[id]` route.
- The character CSV importer doesn't support quoted fields, so character
  names containing commas will misparse.
