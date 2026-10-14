import type { EventOut, EventRegistrationOut, EventRegistrationStatus } from "@/types/api";

export const MIDNIGHT_CRISIS = "midnight-crisis";

export const EVENT_STATUSES: EventRegistrationStatus[] = [
  "Pending",
  "Registered",
  "Accepted",
  "Waitlist",
  "Rejected",
  "Withdrawn"
];

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
