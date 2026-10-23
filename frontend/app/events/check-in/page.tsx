"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Undo2 } from "lucide-react";

import { useCheckIns, useEvents, useUndoCheckIn } from "@/hooks/useAdminQueries";
import { FilterChips, PageHeader, PageShell, QueryState } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
      </span>
      Live
    </span>
  );
}

export default function CheckInPage() {
  // Polled with the feed: walk-ins and undos change the attending totals.
  const eventsQuery = useEvents({ refetchInterval: 3000 });
  const checkInsQuery = useCheckIns();
  const undoCheckIn = useUndoCheckIn();
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const checkIns = useMemo(() => checkInsQuery.data ?? [], [checkInsQuery.data]);

  // Highlight rows that arrived since the last poll.
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!checkInsQuery.data) return;
    const ids = checkInsQuery.data.map((c) => c.registration_id);
    const added = seen.current ? ids.filter((id) => !seen.current?.has(id)) : [];
    seen.current = new Set(ids);
    if (added.length) setFresh(new Set(added));
  }, [checkInsQuery.data]);
  // Keyed on `fresh` alone, so a later poll with no new rows can't cancel the fade.
  useEffect(() => {
    if (!fresh.size) return;
    const t = setTimeout(() => setFresh(new Set()), 4000);
    return () => clearTimeout(t);
  }, [fresh]);

  const perEvent = useMemo(
    () =>
      events.map((event) => {
        const attending = (event.counts.Registered ?? 0) + (event.counts.Accepted ?? 0);
        const eventCheckIns = checkIns.filter((c) => c.event_slug === event.slug);
        const walkIns = eventCheckIns.filter((c) => c.walk_in).length;
        return { event, attending, checkedIn: eventCheckIns.length, walkIns };
      }),
    [events, checkIns]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return checkIns.filter(
      (c) =>
        (eventFilter === "all" || c.event_slug === eventFilter) &&
        (!q ||
          c.delegate_name.toLowerCase().includes(q) ||
          c.delegate_email.toLowerCase().includes(q))
    );
  }, [checkIns, eventFilter, search]);

  return (
    <PageShell>
      <PageHeader eyebrow="Events" title="Check-in" action={<LiveDot />} />

      <section className="grid gap-4 sm:grid-cols-3">
        {perEvent.map(({ event, attending, checkedIn, walkIns }) => {
          const pct = attending ? Math.min(100, Math.round((checkedIn / attending) * 100)) : 0;
          return (
            <Card key={event.id}>
              <CardHeader className="pb-2">
                <CardDescription>{event.name}</CardDescription>
                <CardTitle className="text-3xl">
                  {checkedIn}
                  <span className="text-lg font-medium text-[var(--ssicsim-text-muted)]">
                    {" "}
                    / {attending} checked in
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--ssicsim-bg-soft)]">
                  <div
                    className="h-full rounded-full bg-green-600 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {walkIns > 0 && (
                  <p className="mt-2 text-xs text-[var(--ssicsim-text-muted)]">
                    Includes {walkIns} walk-in{walkIns === 1 ? "" : "s"}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Check-in feed</CardTitle>
              <CardDescription className="mt-1">
                Newest first, refreshes every few seconds.
              </CardDescription>
            </div>
            <Input
              className="w-64"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <FilterChips
            options={[{ slug: "all", name: "All events" }, ...events].map((e) => ({
              value: e.slug,
              label: e.name
            }))}
            value={eventFilter}
            onChange={setEventFilter}
          />
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={checkInsQuery.isLoading}
            isError={checkInsQuery.isError}
            isEmpty={visible.length === 0}
            loadingLabel="Loading check-ins..."
            errorLabel="Failed to load check-ins."
            emptyLabel="No one has checked in yet."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Time</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((c) => (
                  <TableRow
                    key={c.registration_id}
                    className={cn(
                      "transition-colors duration-1000",
                      fresh.has(c.registration_id) && "bg-green-50"
                    )}
                  >
                    <TableCell>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </TableCell>
                    <TableCell className="tabular-nums text-[var(--ssicsim-text-muted)]">
                      {formatTime(c.checked_in_at)}
                    </TableCell>
                    <TableCell className="font-semibold text-green-700">
                      {c.delegate_name}
                      {c.walk_in && (
                        <Badge variant="info" className="ml-2">
                          Walk-in
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--ssicsim-text-muted)]">
                      {c.delegate_email}
                    </TableCell>
                    <TableCell>
                      <Link className="hover:underline" href={`/events/${c.event_slug}`}>
                        {c.event_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={undoCheckIn.isPending}
                        onClick={() =>
                          undoCheckIn.mutate({ slug: c.event_slug, id: c.registration_id })
                        }
                      >
                        <Undo2 className="h-3.5 w-3.5" /> Undo
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </PageShell>
  );
}
