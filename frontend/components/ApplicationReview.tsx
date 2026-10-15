"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useEventCharacters, useUpdateEventRegistration } from "@/hooks/useAdminQueries";
import { apiErrorMessage } from "@/lib/apiClient";
import type {
  DelegationOut,
  EventOut,
  EventRegistrationOut,
  EventRegistrationStatus,
  UUID
} from "@/types/api";
import { Field } from "@/components/DelegateTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { delegateName, delegationNameFor } from "@/utils/csv";
import {
  MIDNIGHT_CRISIS_TEMPLATES,
  emailerLink,
  eventStatusBadge,
  formatAnswer,
  formatEventDateTime
} from "@/utils/events";

// Steps through a selective event's applications one at a time so SEC can
// accept or reject each. Decisions are ordinary status changes; delegates are
// only emailed when someone sends the acceptance/rejection templates.

type Scope = "pending" | "all";
type Decision = {
  id: UUID;
  name: string;
  from: EventRegistrationStatus;
  to: EventRegistrationStatus;
};

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function ApplicationReview({
  event,
  registrations,
  delegationsById,
  isLoading
}: {
  event: EventOut;
  registrations: EventRegistrationOut[];
  delegationsById: Map<UUID, DelegationOut>;
  isLoading: boolean;
}) {
  const updateRegistration = useUpdateEventRegistration(event.slug);
  const charactersQuery = useEventCharacters(event.slug, event.has_characters);
  const [scope, setScope] = useState<Scope>("pending");
  const [currentId, setCurrentId] = useState<UUID | null>(null);
  const [lastDecision, setLastDecision] = useState<Decision | null>(null);
  // Decisions saved here, applied until the refetched registrations catch up.
  const [overrides, setOverrides] = useState<Record<UUID, EventRegistrationStatus>>({});
  const [error, setError] = useState<string | null>(null);

  // Oldest first: applications are reviewed in the order they came in.
  const queue = useMemo(
    () =>
      registrations
        .map((r) => (overrides[r.id] ? { ...r, status: overrides[r.id] } : r))
        .filter((r) => (scope === "pending" ? r.status === "Pending" : r.status !== "Withdrawn"))
        .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")),
    [registrations, overrides, scope]
  );

  const index = Math.max(
    0,
    queue.findIndex((r) => r.id === currentId)
  );
  const current = queue[index] as EventRegistrationOut | undefined;

  const counts = event.counts;
  const accepted = counts.Accepted ?? 0;
  const pending = counts.Pending ?? 0;
  const decided = accepted + (counts.Rejected ?? 0);
  // Spots: the event's capacity if set, otherwise one per character.
  const spots = event.capacity ?? (event.has_characters ? charactersQuery.data?.length : undefined);
  const full = spots != null && accepted >= spots;

  const save = async (
    id: UUID,
    status: EventRegistrationStatus,
    previous: EventRegistrationStatus
  ) => {
    setOverrides((o) => ({ ...o, [id]: status }));
    try {
      await updateRegistration.mutateAsync({ id, data: { status } });
      return true;
    } catch (e) {
      setOverrides((o) => ({ ...o, [id]: previous }));
      setError(apiErrorMessage(e, "Unable to save the decision."));
      return false;
    }
  };

  const decide = async (to: EventRegistrationStatus) => {
    if (!current || current.status === to || updateRegistration.isPending) return;
    setError(null);
    const decision: Decision = {
      id: current.id,
      name: delegateName(current.delegate),
      from: current.status,
      to
    };
    // Move on to the next application. In the pending queue the decided one
    // drops out, so after the last one fall back to the one before it.
    setCurrentId(
      queue[index + 1]?.id ?? (scope === "pending" ? (queue[index - 1]?.id ?? null) : current.id)
    );
    if (await save(decision.id, to, decision.from)) setLastDecision(decision);
    else setCurrentId(decision.id);
  };

  const undo = async () => {
    if (!lastDecision || updateRegistration.isPending) return;
    setError(null);
    if (await save(lastDecision.id, lastDecision.from, lastDecision.to)) {
      setCurrentId(lastDecision.id);
      setLastDecision(null);
    }
  };

  const hasPrevious = index > 0;
  const hasNext = index < queue.length - 1;
  const previous = () => hasPrevious && setCurrentId(queue[index - 1].id);
  const next = () => hasNext && setCurrentId(queue[index + 1].id);

  // Keyboard: A accept, R reject, ← / → previous / next, U undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "a") void decide("Accepted");
      else if (key === "r") void decide("Rejected");
      else if (key === "arrowright") next();
      else if (key === "arrowleft") previous();
      else if (key === "u") void undo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const d = current?.delegate;
  const motivation = current ? formatAnswer(event, current, "motivation") : "";
  const busy = updateRegistration.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ssicsim-text-muted)]">
              Reviewed
            </p>
            <p className="text-sm font-semibold text-[var(--ssicsim-brand-navy)]">
              {decided} of {decided + pending}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ssicsim-text-muted)]">
              Accepted
            </p>
            <p
              className={`text-sm font-semibold ${full ? "text-rose-700" : "text-[var(--ssicsim-brand-navy)]"}`}
            >
              {accepted}
              {spots != null ? ` / ${spots} spots` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="info">Pending: {pending}</Badge>
            <Badge variant="destructive">Rejected: {counts.Rejected ?? 0}</Badge>
            {counts.Withdrawn ? (
              <Badge variant="secondary">Withdrawn: {counts.Withdrawn}</Badge>
            ) : null}
          </div>
          <div className="ml-auto flex rounded-md border border-[var(--ssicsim-border)] p-0.5 text-sm">
            {(["pending", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setScope(s);
                  setCurrentId(null);
                }}
                className={`rounded px-3 py-1 ${
                  scope === s
                    ? "bg-[var(--ssicsim-brand-navy)] text-white"
                    : "text-[var(--ssicsim-text-muted)]"
                }`}
              >
                {s === "pending" ? "Pending only" : "All applications"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {full && pending > 0 ? (
        <Badge variant="warning">
          Every spot is taken. Accepting more will put {event.name} over capacity.
        </Badge>
      ) : null}
      {error ? <Badge variant="warning">{error}</Badge> : null}
      {lastDecision ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ssicsim-text-muted)]">
          <span>
            {lastDecision.to === "Pending"
              ? `Moved ${lastDecision.name} back to Pending.`
              : `${lastDecision.to} ${lastDecision.name}.`}
          </span>
          <Button size="sm" variant="ghost" onClick={() => void undo()} disabled={busy}>
            Undo (U)
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading applications…</p>
      ) : !current || !d ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm font-semibold text-[var(--ssicsim-brand-navy)]">
              {scope === "pending" && registrations.length > 0
                ? "Every application has been reviewed."
                : "No applications yet."}
            </p>
            {decided > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <Link
                    href={emailerLink(event.slug, "Accepted", MIDNIGHT_CRISIS_TEMPLATES.Accepted)}
                  >
                    Email accepted ({accepted})
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link
                    href={emailerLink(event.slug, "Rejected", MIDNIGHT_CRISIS_TEMPLATES.Rejected)}
                  >
                    Email rejected ({counts.Rejected ?? 0})
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-[var(--ssicsim-text-muted)]">
                  Application {index + 1} of {queue.length}
                </p>
                <h2 className="text-xl font-semibold text-[var(--ssicsim-brand-navy)]">
                  {delegateName(d)}
                </h2>
              </div>
              <Badge variant={eventStatusBadge[current.status]}>{current.status}</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ssicsim-text-muted)]">
                  Why Midnight Crisis?
                </p>
                <p className="text-xs text-[var(--ssicsim-text-muted)]">
                  {wordCount(motivation)} words
                </p>
              </div>
              <p className="whitespace-pre-wrap break-words rounded-md border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-4 text-[15px] leading-relaxed text-[var(--ssicsim-text)]">
                {motivation || "--"}
              </p>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Experience" value={d.delegate_experience} />
              <Field label="Grade" value={d.grade} />
              <Field label="Delegation" value={delegationNameFor(d, delegationsById)} />
              <Field
                label="Committee preferences"
                value={[d.first_committee, d.second_committee, d.third_committee]
                  .filter(Boolean)
                  .join(" → ")}
                span
              />
              <Field label="Applied" value={formatEventDateTime(current.created_at)} />
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => void decide("Accepted")}
                disabled={busy || current.status === "Accepted"}
              >
                Accept (A)
              </Button>
              <Button
                variant="secondary"
                className="border-rose-200 text-rose-700"
                onClick={() => void decide("Rejected")}
                disabled={busy || current.status === "Rejected"}
              >
                Reject (R)
              </Button>
              {scope === "all" && current.status !== "Pending" ? (
                <Button variant="ghost" onClick={() => void decide("Pending")} disabled={busy}>
                  Move to Pending
                </Button>
              ) : null}
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" onClick={previous} disabled={!hasPrevious}>
                  ← Previous
                </Button>
                <Button variant="ghost" onClick={next} disabled={!hasNext}>
                  Next →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
