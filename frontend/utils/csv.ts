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

// A character can suit more than one experience level, so the CSV cell (and
// exported cell) holds a semicolon-separated list rather than a single value
// — commas are already the field delimiter, so they can't be reused here.
export function joinExperience(experience: CharacterExperience[]): string {
  return experience.join("; ");
}

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

const UNCONFIRMED_PAYMENT_STATUSES = new Set(["Awaiting Payment", "Verify Payment"]);

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
  const scoped = opts?.delegationId
    ? delegates.filter((d) => d.delegation_id === opts.delegationId)
    : delegates;

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
  const headers = [
    "delegation",
    "delegate",
    "email",
    "committee",
    "character",
    "priority",
    "experience"
  ];
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
        character.name,
        character.priority ?? "",
        joinExperience(character.experience)
      ];
    })
    .sort(
      (a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1]))
    );

  return { headers, rows };
}
