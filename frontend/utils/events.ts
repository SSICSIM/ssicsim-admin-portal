import type { EventOut, EventRegistrationOut, EventRegistrationStatus } from "@/types/api";

export const EVENT_STATUSES: EventRegistrationStatus[] = [
  "Pending",
  "Registered",
  "Accepted",
  "Waitlist",
  "Rejected",
  "Withdrawn"
];

const SELECTIVE_STATUSES: EventRegistrationStatus[] = [
  "Pending",
  "Accepted",
  "Rejected",
  "Withdrawn"
];

export function statusesFor(event: EventOut | undefined): EventRegistrationStatus[] {
  return event?.selective ? SELECTIVE_STATUSES : EVENT_STATUSES;
}

export function formatEventDateTime(value: string | null, empty = "--"): string {
  if (!value) return empty;
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export const eventStatusBadge: Record<
  EventRegistrationStatus,
  "success" | "warning" | "secondary" | "destructive" | "info" | "default"
> = {
  Pending: "info",
  Registered: "success",
  Accepted: "success",
  Waitlist: "warning",
  Rejected: "destructive",
  Withdrawn: "secondary"
};

// Statuses that hold a spot (and count toward capacity).
export function isAttending(status: EventRegistrationStatus): boolean {
  return status === "Registered" || status === "Accepted";
}

export type AnswerField = {
  key: string;
  label: string;
  // Shown as its own column in the registrations table (else only in View / CSV)
  inTable?: boolean;
};

// The event-specific questions from each website form, in form order.
export const EVENT_ANSWER_FIELDS: Record<string, AnswerField[]> = {
  "midnight-crisis": [
    { key: "motivation", label: "Why Midnight Crisis", inTable: true },
    { key: "attendance_policy_ack", label: "Attendance policy" },
    { key: "attendance_mandatory_ack", label: "Full attendance ack" },
    { key: "withdrawal_policy_ack", label: "Withdrawal policy" },
    { key: "withdrawal_notice_ack", label: "Withdrawal notice ack" }
  ],
  "delegate-social": [
    { key: "allergies", label: "Allergies", inTable: true },
    { key: "dietary", label: "Dietary", inTable: true },
    { key: "dietary_details", label: "Dietary details", inTable: true },
    { key: "withdrawal_policy_ack", label: "Withdrawal policy" },
    { key: "withdrawal_notice_ack", label: "Withdrawal notice ack" }
  ],
  "delegate-training": [
    { key: "session", label: "Session", inTable: true },
    { key: "questions", label: "Questions / concerns" },
    { key: "topics", label: "Topics to cover" }
  ]
};

export function answerFields(slug: string): AnswerField[] {
  return EVENT_ANSWER_FIELDS[slug] ?? [];
}

export function sessionLabel(event: EventOut | undefined, key: unknown): string {
  if (typeof key !== "string" || !key) return "";
  return event?.sessions.find((s) => s.key === key)?.label ?? key;
}

export function formatAnswer(
  event: EventOut | undefined,
  registration: EventRegistrationOut,
  key: string
): string {
  const value = registration.answers?.[key];
  if (key === "session") return sessionLabel(event, value);
  if (value == null) return "";
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

// Seeded by migration f8b2d3e4c5a6; the Midnight Crisis page links to the
// emailer with these pre-selected.
export const MIDNIGHT_CRISIS_TEMPLATES = {
  Accepted: "Midnight Crisis – Acceptance",
  Rejected: "Midnight Crisis – Rejection"
} as const;

export function emailerLink(slug: string, status: string, template?: string): string {
  const params = new URLSearchParams({ event: slug, status });
  if (template) params.set("template", template);
  return `/emailer?${params.toString()}`;
}
