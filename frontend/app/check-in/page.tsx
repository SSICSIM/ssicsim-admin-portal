"use client";

import { useMemo, useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { CheckCircle2, Undo2 } from "lucide-react";

import {
  useCharacters,
  useCheckInLog,
  useCommittees,
  useDelegateCheckIn,
  useDelegates,
  useDelegationCheckIn,
  useDelegations,
  useSecMembers
} from "@/hooks/useAdminQueries";
import { apiErrorMessage } from "@/lib/apiClient";
import { delegateStatusBadge } from "@/components/DelegateTable";
import { FilterChips, PageHeader, PageShell, QueryState, StatRow } from "@/components/page";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { delegateName, delegationNameFor, isOnRoster } from "@/utils/csv";
import { formatEventDateTime } from "@/utils/events";
import type { DelegateOut, UUID } from "@/types/api";

// Several desks check people in at once, so the list on screen keeps refreshing.
const POLL_MS = 5000;

type View = "delegates" | "delegations" | "log";
type Shown = "all" | "waiting" | "checked-in";

const SHOWN_OPTIONS: { value: Shown; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Not checked in" },
  { value: "checked-in", label: "Checked in" }
];

const SEARCH_PLACEHOLDER: Record<View, string> = {
  delegates: "Search name, email or delegation",
  delegations: "Search delegation or advisor",
  log: "Search the log"
};

function matches(q: string, ...fields: (string | null | undefined)[]): boolean {
  return !q || fields.filter(Boolean).join(" ").toLowerCase().includes(q);
}

function matchesShown(shown: Shown, checkedInAt: string | null): boolean {
  return shown === "all" || (shown === "checked-in") === Boolean(checkedInAt);
}

function CheckInCell({
  checkedInAt,
  disabled,
  blockedLabel,
  onToggle
}: {
  checkedInAt: string | null;
  disabled: boolean;
  // Shown instead of the button when they can't be checked in
  blockedLabel?: string;
  onToggle: (undo: boolean) => void;
}) {
  if (!checkedInAt && blockedLabel) {
    return <span className="text-sm text-[var(--ssicsim-text-muted)]">{blockedLabel}</span>;
  }
  if (!checkedInAt) {
    return (
      <Button size="sm" disabled={disabled} onClick={() => onToggle(false)}>
        Check in
      </Button>
    );
  }
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
        <CheckCircle2 className="h-4 w-4" /> {formatEventDateTime(checkedInAt)}
      </span>
      <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onToggle(true)}>
        <Undo2 className="h-3.5 w-3.5" /> Undo
      </Button>
    </div>
  );
}

export default function ConferenceCheckInPage() {
  const [view, setView] = useState<View>("delegates");
  const [shown, setShown] = useState<Shown>("all");
  const [search, setSearch] = useState("");

  // Only what's on screen refreshes. The delegations tab needs delegates too,
  // for its counts. New desk volunteers get a sec member row on their first
  // action, so that refreshes with the log.
  const poll = (...views: View[]) => (views.includes(view) ? POLL_MS : undefined);
  const delegatesQuery = useDelegates({ refetchInterval: poll("delegates", "delegations") });
  const delegationsQuery = useDelegations({ refetchInterval: poll("delegations") });
  const logsQuery = useCheckInLog({ refetchInterval: poll("log") });
  const secMembersQuery = useSecMembers({ refetchInterval: poll("log") });
  const charactersQuery = useCharacters();
  const committeesQuery = useCommittees();
  const delegateCheckIn = useDelegateCheckIn();
  const delegationCheckIn = useDelegationCheckIn();

  // Only the latest action's error shows; starting another clears it.
  const [error, setError] = useState<Error | null>(null);
  function run<V>(mutation: UseMutationResult<unknown, Error, V>, vars: V) {
    setError(null);
    mutation.mutate(vars, { onError: setError });
  }

  const delegates = useMemo(() => delegatesQuery.data ?? [], [delegatesQuery.data]);
  const delegateById = useMemo(() => new Map(delegates.map((d) => [d.id, d])), [delegates]);
  const delegations = useMemo(() => delegationsQuery.data ?? [], [delegationsQuery.data]);
  // Waitlisted delegates hold no spot, so they aren't expected at the desk.
  const attending = useMemo(() => delegates.filter(isOnRoster), [delegates]);

  const delegationById = useMemo(() => new Map(delegations.map((d) => [d.id, d])), [delegations]);
  // Assigned committee, so the desk can point people to the right room.
  const committeeByDelegate = useMemo(() => {
    const committeeNames = new Map((committeesQuery.data ?? []).map((c) => [c.id, c.name]));
    const map = new Map<UUID, string>();
    (charactersQuery.data ?? []).forEach((c) => {
      const name = committeeNames.get(c.committee_id);
      if (c.delegate_id && name) map.set(c.delegate_id, name);
    });
    return map;
  }, [charactersQuery.data, committeesQuery.data]);
  const attendingByDelegation = useMemo(() => {
    const map = new Map<UUID, DelegateOut[]>();
    attending.forEach((d) => {
      if (!d.delegation_id) return;
      const members = map.get(d.delegation_id);
      if (members) members.push(d);
      else map.set(d.delegation_id, [d]);
    });
    return map;
  }, [attending]);

  const delegatesIn = attending.filter((d) => d.checked_in_at).length;
  const delegationsIn = delegations.filter((d) => d.checked_in_at).length;

  const q = search.trim().toLowerCase();
  const visibleDelegates = useMemo(
    () =>
      (shown === "waiting" ? attending : delegates).filter(
        (d) =>
          matchesShown(shown, d.checked_in_at) &&
          matches(
            q,
            d.full_name,
            d.first_name,
            d.last_name,
            d.preferred_name,
            d.email,
            delegationNameFor(d, delegationById, "")
          )
      ),
    [attending, delegates, delegationById, q, shown]
  );
  const visibleDelegations = useMemo(
    () =>
      delegations.filter(
        (d) =>
          matchesShown(shown, d.checked_in_at) &&
          matches(q, d.name, d.faculty_advisor_first_name, d.faculty_advisor_last_name)
      ),
    [delegations, q, shown]
  );
  const log = useMemo(
    () => (logsQuery.data ?? []).filter((entry) => matches(q, entry.details)),
    [logsQuery.data, q]
  );
  const secMemberNames = useMemo(
    () =>
      new Map((secMembersQuery.data ?? []).map((m) => [m.id, `${m.first_name} ${m.last_name}`])),
    [secMembersQuery.data]
  );

  const busy = delegateCheckIn.isPending || delegationCheckIn.isPending;

  return (
    <PageShell>
      <PageHeader eyebrow="Conference" title="Check-in" />

      <StatRow
        stats={[
          { label: "Delegates checked in", value: `${delegatesIn} / ${attending.length}` },
          { label: "Delegations checked in", value: `${delegationsIn} / ${delegations.length}` },
          { label: "Delegates still to arrive", value: attending.length - delegatesIn }
        ]}
      />

      {error ? (
        <Alert className="border-rose-200 bg-rose-50 text-rose-700">
          {apiErrorMessage(error, "That didn't save.")}
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="delegates">Delegates</TabsTrigger>
                <TabsTrigger value="delegations">Delegations</TabsTrigger>
                <TabsTrigger value="log">Log</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              autoFocus
              className="w-72"
              placeholder={SEARCH_PLACEHOLDER[view]}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {view !== "log" ? (
            <FilterChips options={SHOWN_OPTIONS} value={shown} onChange={setShown} />
          ) : null}
        </CardHeader>

        <CardContent>
          {view === "delegates" ? (
            <QueryState
              isLoading={delegatesQuery.isLoading}
              isError={delegatesQuery.isError}
              isEmpty={visibleDelegates.length === 0}
              loadingLabel="Loading delegates..."
              errorLabel="Failed to load delegates."
              emptyLabel="No delegates match."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Delegation</TableHead>
                    <TableHead>Committee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDelegates.map((d) => (
                    <TableRow key={d.id} className={cn(d.checked_in_at && "bg-green-50/60")}>
                      <TableCell>
                        <p className="font-semibold">
                          {delegateName(d)}
                          {d.preferred_name && d.preferred_name !== d.first_name
                            ? ` (${d.preferred_name})`
                            : ""}
                        </p>
                        <p className="text-xs text-[var(--ssicsim-text-muted)]">{d.email}</p>
                      </TableCell>
                      <TableCell>{delegationNameFor(d, delegationById, "Independent")}</TableCell>
                      <TableCell>{committeeByDelegate.get(d.id) ?? "--"}</TableCell>
                      <TableCell>
                        <Badge variant={delegateStatusBadge[d.delegate_status]}>
                          {d.delegate_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <CheckInCell
                          checkedInAt={d.checked_in_at}
                          disabled={busy}
                          blockedLabel={isOnRoster(d) ? undefined : "On waitlist"}
                          onToggle={(undo) => run(delegateCheckIn, { id: d.id, undo })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </QueryState>
          ) : null}

          {view === "delegations" ? (
            <QueryState
              isLoading={delegationsQuery.isLoading}
              isError={delegationsQuery.isError}
              isEmpty={visibleDelegations.length === 0}
              loadingLabel="Loading delegations..."
              errorLabel="Failed to load delegations."
              emptyLabel="No delegations match."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delegation</TableHead>
                    <TableHead>Faculty Advisor/Head Delegate</TableHead>
                    <TableHead>Delegates checked in</TableHead>
                    <TableHead className="text-right">Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDelegations.map((d) => {
                    const members = attendingByDelegation.get(d.id) ?? [];
                    const membersIn = members.filter((m) => m.checked_in_at).length;
                    const headDelegate = d.head_delegate_id
                      ? delegateById.get(d.head_delegate_id)
                      : undefined;
                    return (
                      <TableRow key={d.id} className={cn(d.checked_in_at && "bg-green-50/60")}>
                        <TableCell className="font-semibold">{d.name}</TableCell>
                        <TableCell>
                          <p>
                            {[d.faculty_advisor_first_name, d.faculty_advisor_last_name]
                              .filter(Boolean)
                              .join(" ") || "--"}
                          </p>
                          {headDelegate ? (
                            <p className="text-xs text-[var(--ssicsim-text-muted)]">
                              Head delegate: {delegateName(headDelegate)}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {membersIn} / {members.length}
                        </TableCell>
                        <TableCell className="text-right">
                          <CheckInCell
                            checkedInAt={d.checked_in_at}
                            disabled={busy}
                            onToggle={(undo) => run(delegationCheckIn, { id: d.id, undo })}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </QueryState>
          ) : null}

          {view === "log" ? (
            <QueryState
              isLoading={logsQuery.isLoading}
              isError={logsQuery.isError}
              isEmpty={log.length === 0}
              loadingLabel="Loading log..."
              errorLabel="Failed to load the log."
              emptyLabel="No check-ins yet."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>What happened</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="tabular-nums text-[var(--ssicsim-text-muted)]">
                        {formatEventDateTime(entry.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{entry.details}</TableCell>
                      <TableCell className="text-[var(--ssicsim-text-muted)]">
                        {(entry.sec_member_id && secMemberNames.get(entry.sec_member_id)) || "--"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </QueryState>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
