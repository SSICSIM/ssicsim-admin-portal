"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useEvents } from "@/hooks/useAdminQueries";
import type { EventOut } from "@/types/api";
import { PageHeader, PageShell, QueryState, StatRow } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_STATUSES, eventStatusBadge, formatEventDateTime } from "@/utils/events";

function isAcceptingRegistrations(event: EventOut): boolean {
  if (!event.registration_open) return false;
  return !event.registration_deadline || new Date(event.registration_deadline) > new Date();
}

function FillBar({ filled, capacity }: { filled: number; capacity: number | null }) {
  if (capacity == null || capacity === 0) {
    return <p className="text-sm text-[var(--ssicsim-text-muted)]">{filled} registered</p>;
  }
  const pct = Math.min(100, Math.round((filled / capacity) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--ssicsim-text-muted)]">
        <span>
          {filled} / {capacity}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--ssicsim-bg-soft)]">
        <div
          className="h-full rounded-full bg-[var(--ssicsim-brand-gold)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function EventsPage() {
  const eventsQuery = useEvents();
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const stats = useMemo(() => {
    const total = events.reduce(
      (sum, e) => sum + Object.values(e.counts).reduce((a, n) => a + (n ?? 0), 0),
      0
    );
    const waitlisted = events.reduce((sum, e) => sum + (e.counts.Waitlist ?? 0), 0);
    const pending = events.reduce((sum, e) => sum + (e.counts.Pending ?? 0), 0);
    return [
      { label: "Total sign-ups", value: total },
      { label: "Waitlisted", value: waitlisted },
      { label: "Pending review", value: pending }
    ];
  }, [events]);

  return (
    <PageShell>
      <PageHeader
        title="Events"
        description="Registrations for Midnight Crisis, Delegate Social, and Delegate Training. Only registered (non-waitlisted) delegates can sign up from the website."
        action={
          <Button asChild size="sm">
            <Link href="/events/check-in">Check-in</Link>
          </Button>
        }
      />

      <StatRow stats={stats} />

      <QueryState
        isLoading={eventsQuery.isLoading}
        isError={eventsQuery.isError}
        isEmpty={events.length === 0}
        loadingLabel="Loading events..."
        errorLabel="Failed to load events."
        emptyLabel="No events found. Run the database migrations to seed them."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const open = isAcceptingRegistrations(event);
            return (
              <Card key={event.id}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      <CardDescription className="mt-1">
                        Closes {formatEventDateTime(event.registration_deadline, "No deadline")}
                      </CardDescription>
                    </div>
                    <Badge variant={open ? "success" : "secondary"}>
                      {open ? "Open" : "Closed"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.sessions.length > 0 ? (
                    <div className="space-y-3">
                      {event.sessions.map((s) => (
                        <div key={s.key} className="space-y-1">
                          <p className="text-xs font-semibold text-[var(--ssicsim-brand-navy)]">
                            {s.label}
                          </p>
                          <FillBar filled={s.filled} capacity={event.capacity} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <FillBar filled={event.filled} capacity={event.capacity} />
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_STATUSES.filter((s) => event.counts[s]).map((s) => (
                      <Badge key={s} variant={eventStatusBadge[s]}>
                        {s}: {event.counts[s]}
                      </Badge>
                    ))}
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/events/${event.slug}`}>
                      {event.has_characters
                        ? "Manage registrations & characters"
                        : "Manage registrations"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </QueryState>
    </PageShell>
  );
}
