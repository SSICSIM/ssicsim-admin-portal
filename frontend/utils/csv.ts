import type {
  CharacterCreate,
  CharacterExperience,
  CharacterOut,
  CommitteeOut,
  DelegateOut,
  DelegationOut,
  RegistrationPeriod,
  UUID
} from "@/types/api";

const CHARACTER_EXPERIENCES: CharacterExperience[] = ["Beginner", "Intermediate", "Advanced"];

export async function parseCharacterCsv(
  file: File,
  committeeId: string
): Promise<{ characters: CharacterCreate[]; warnings: string[] }> {
  const raw = await file.text();
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { characters: [], warnings: [] };
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const rows = lines.slice(1);

  const nameIndex = headers.indexOf("character_name");
  if (nameIndex === -1) {
    throw new Error("CSV must include a 'character_name' header.");
  }
  const priorityIndex = headers.indexOf("priority");
  const experienceIndex = headers.indexOf("experience");

  const characters: CharacterCreate[] = [];
  const warnings: string[] = [];

  rows
    .map((row) => row.split(",").map((cell) => cell.trim()))
    .forEach((cells, i) => {
      const rowNumber = i + 2; // +1 for header, +1 for 1-based display
      const name = cells[nameIndex];
      if (!name) return;

      let priority: number | null = null;
      if (priorityIndex !== -1 && cells[priorityIndex]) {
        const parsed = Number.parseInt(cells[priorityIndex], 10);
        if (Number.isNaN(parsed) || parsed < 1 || parsed > 5) {
          warnings.push(
            `Row ${rowNumber} (${name}): priority "${cells[priorityIndex]}" must be 1-5, skipped.`
          );
        } else {
          priority = parsed;
        }
      }

      const experience: CharacterExperience[] = [];
      if (experienceIndex !== -1 && cells[experienceIndex]) {
        const tokens = cells[experienceIndex]
          .split(";")
          .map((t) => t.trim())
          .filter(Boolean);
        for (const token of tokens) {
          const match = CHARACTER_EXPERIENCES.find((e) => e.toLowerCase() === token.toLowerCase());
          if (!match) {
            warnings.push(
              `Row ${rowNumber} (${name}): experience "${token}" is not Beginner/Intermediate/Advanced, skipped.`
            );
          } else if (!experience.includes(match)) {
            experience.push(match);
          }
        }
      }

      characters.push({
        name,
        committee_id: committeeId,
        delegate_id: null,
        priority,
        experience
      });
    });

  return { characters, warnings };
}

// ─── CSV export ─────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(","))
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const REGISTRATION_PRICES: Record<RegistrationPeriod, number> = {
  "Early Bird": 70,
  Regular: 90,
  Late: 110
};

// Waitlisted delegates hold no spot and haven't paid, so they're left out of
// every roster, financial, and delegation count.
export function isOnRoster(d: DelegateOut): boolean {
  return d.delegate_status !== "Waitlist";
}

const UNCONFIRMED_PAYMENT_STATUSES = new Set(["Waitlist", "Awaiting Payment", "Verify Payment"]);

export function paymentStatusLabel(d: DelegateOut): string {
  if (d.financial_aid_status === "Delegation Paying") return "Delegation pays";
  return UNCONFIRMED_PAYMENT_STATUSES.has(d.delegate_status) ? "Not yet paid" : "Paid";
}

function delegateName(d: DelegateOut): string {
  return d.full_name || `${d.first_name} ${d.last_name}`;
}

export function buildFinancialRows(
  delegates: DelegateOut[],
  delegationsById: Map<UUID, DelegationOut>,
  opts?: { delegationId?: UUID }
): { headers: string[]; rows: (string | number)[][] } {
  const headers = [
    "delegation",
    "delegate",
    "email",
    "registration_period",
    "price",
    "financial_aid_status",
    "payment_status"
  ];
  const roster = delegates.filter(isOnRoster);
  const scoped = opts?.delegationId
    ? roster.filter((d) => d.delegation_id === opts.delegationId)
    : roster;

  const rows = scoped
    .map((d): (string | number)[] => {
      const delegationName = d.delegation_id
        ? (delegationsById.get(d.delegation_id)?.name ?? "")
        : "Independent Delegate";
      const price = d.registration_period ? REGISTRATION_PRICES[d.registration_period] : "";
      const paymentStatus = paymentStatusLabel(d);
      return [
        delegationName,
        delegateName(d),
        d.email,
        d.registration_period ?? "",
        price,
        d.financial_aid_status ?? "",
        paymentStatus
      ];
    })
    .sort(
      (a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1]))
    );

  return { headers, rows };
}

export function buildCharacterAssignmentRows(
  delegates: DelegateOut[],
  characters: CharacterOut[],
  committeesById: Map<UUID, CommitteeOut>,
  delegationsById: Map<UUID, DelegationOut>,
  opts?: { delegationId?: UUID }
): { headers: string[]; rows: (string | number)[][] } {
  // Character priority/experience are internal assignment-planning data —
  // never included in a delegate-facing export.
  const headers = ["delegation", "delegate", "email", "committee", "character"];
  const characterByDelegateId = new Map(
    characters.filter((c) => c.delegate_id).map((c) => [c.delegate_id as UUID, c])
  );
  const scoped = opts?.delegationId
    ? delegates.filter((d) => d.delegation_id === opts.delegationId)
    : delegates;

  const rows = scoped
    .filter((d) => characterByDelegateId.has(d.id))
    .map((d): (string | number)[] => {
      const character = characterByDelegateId.get(d.id)!;
      const delegationName = d.delegation_id
        ? (delegationsById.get(d.delegation_id)?.name ?? "")
        : "Independent Delegate";
      return [
        delegationName,
        delegateName(d),
        d.email,
        committeesById.get(character.committee_id)?.name ?? "",
        character.name
      ];
    })
    .sort(
      (a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1]))
    );

  return { headers, rows };
}

function delegationNameFor(d: DelegateOut, delegationsById: Map<UUID, DelegationOut>): string {
  return d.delegation_id ? (delegationsById.get(d.delegation_id)?.name ?? "") : "";
}

function delegatePrice(d: DelegateOut): number | "" {
  return d.registration_period ? REGISTRATION_PRICES[d.registration_period] : "";
}

// "YYYY-MM-DD HH:mm" in local time — a format Google Sheets parses as a datetime.
function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// Original delegate export columns. The master sheet is refreshed by importing
// this CSV with "replace current sheet", so keep this order stable and only
// append new columns to FULL_DELEGATE_EXTRA_HEADERS.
const DELEGATE_BASE_HEADERS = [
  "id",
  "first_name",
  "last_name",
  "full_name",
  "preferred_name",
  "grade",
  "email",
  "phone",
  "delegate_experience",
  "delegate_status",
  "registration_period",
  "first_committee",
  "second_committee",
  "third_committee",
  "committee_selection_ack",
  "delegation",
  "code_of_conduct_url",
  "payment_policy_ack",
  "cancellation_policy_ack",
  "financial_aid_status",
  "financial_aid_reason",
  "financial_aid_contacted",
  "payment_receipt_url",
  "heard_about",
  "notes"
];

const FULL_DELEGATE_EXTRA_HEADERS = [
  "date_applied",
  "price",
  "payment_status",
  "assigned_committee",
  "assigned_character"
];

export function buildFullDelegateRows(
  delegates: DelegateOut[],
  characters: CharacterOut[],
  committeesById: Map<UUID, CommitteeOut>,
  delegationsById: Map<UUID, DelegationOut>
): { headers: string[]; rows: (string | number)[][] } {
  // Character priority/experience are internal assignment-planning data —
  // never included in an export.
  const headers = [...DELEGATE_BASE_HEADERS, ...FULL_DELEGATE_EXTRA_HEADERS];
  const characterByDelegateId = new Map(
    characters.filter((c) => c.delegate_id).map((c) => [c.delegate_id as UUID, c])
  );

  const rows = delegates.map((d): (string | number)[] => {
    const base = DELEGATE_BASE_HEADERS.map((k) =>
      k === "delegation"
        ? delegationNameFor(d, delegationsById)
        : String((d as Record<string, unknown>)[k] ?? "")
    );
    const character = characterByDelegateId.get(d.id);
    return [
      ...base,
      formatDateTime(d.date_applied),
      delegatePrice(d),
      paymentStatusLabel(d),
      character ? (committeesById.get(character.committee_id)?.name ?? "") : "",
      character?.name ?? ""
    ];
  });

  return { headers, rows };
}

export function buildDelegationRows(
  delegations: DelegationOut[],
  delegates: DelegateOut[]
): { headers: string[]; rows: (string | number)[][] } {
  const headers = [
    "delegation",
    "faculty_advisor_name",
    "faculty_advisor_email",
    "contact_role",
    "contact_phone",
    "school_address",
    "delegation_size",
    "delegation_size_min",
    "delegation_size_max",
    "registered_delegates",
    "remaining_slots",
    "total_price",
    "attended_before",
    "payment_process",
    "head_delegate",
    "heard_about",
    "notes"
  ];
  const delegatesById = new Map(delegates.map((d) => [d.id, d]));
  const delegatesByDelegation = new Map<UUID | null, DelegateOut[]>();
  for (const d of delegates) {
    if (!isOnRoster(d)) continue;
    const list = delegatesByDelegation.get(d.delegation_id) ?? [];
    list.push(d);
    delegatesByDelegation.set(d.delegation_id, list);
  }
  const totalPrice = (members: DelegateOut[]) =>
    members.reduce((sum, d) => sum + (Number(delegatePrice(d)) || 0), 0);
  const yesNo = (v: boolean | null) => (v == null ? "" : v ? "Yes" : "No");

  const rows = [...delegations]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((delegation): (string | number)[] => {
      const members = delegatesByDelegation.get(delegation.id) ?? [];
      const headDelegate = delegation.head_delegate_id
        ? delegatesById.get(delegation.head_delegate_id)
        : undefined;
      return [
        delegation.name,
        [delegation.faculty_advisor_first_name, delegation.faculty_advisor_last_name]
          .filter(Boolean)
          .join(" "),
        delegation.faculty_advisor_email ?? "",
        delegation.contact_role ?? "",
        delegation.contact_phone ?? "",
        delegation.school_address ?? "",
        delegation.delegation_size ?? "",
        delegation.delegation_size_min ?? "",
        delegation.delegation_size_max ?? "",
        members.length,
        delegation.delegation_size == null
          ? ""
          : Math.max(delegation.delegation_size - members.length, 0),
        totalPrice(members),
        yesNo(delegation.attended_before),
        delegation.payment_process ?? "",
        headDelegate ? delegateName(headDelegate) : "",
        delegation.heard_about ?? "",
        delegation.notes ?? ""
      ];
    });

  const independents = delegatesByDelegation.get(null) ?? [];
  rows.push([
    "Independent Delegates",
    "",
    "",
    "",
    "",
    "",
    independents.length,
    "",
    "",
    independents.length,
    0,
    totalPrice(independents),
    "",
    "",
    "",
    "",
    ""
  ]);

  return { headers, rows };
}

/**
 * Conference-wide delegate projection: each delegation counts as its stated
 * size (or its registered count, if more have registered than stated), plus
 * every independent delegate.
 */
export function projectedDelegateCount(
  delegations: DelegationOut[],
  delegates: DelegateOut[]
): { registered: number; projected: number; waitlisted: number } {
  const registeredByDelegation = new Map<UUID, number>();
  let independents = 0;
  let waitlisted = 0;
  for (const d of delegates) {
    if (!isOnRoster(d)) {
      waitlisted += 1;
    } else if (d.delegation_id) {
      registeredByDelegation.set(
        d.delegation_id,
        (registeredByDelegation.get(d.delegation_id) ?? 0) + 1
      );
    } else {
      independents += 1;
    }
  }
  const projected = delegations.reduce(
    (sum, delegation) =>
      sum +
      Math.max(delegation.delegation_size ?? 0, registeredByDelegation.get(delegation.id) ?? 0),
    independents
  );
  return { registered: delegates.length - waitlisted, projected, waitlisted };
}
