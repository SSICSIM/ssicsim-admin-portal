"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useEventLogs, useSecMembers } from "@/hooks/useAdminQueries";
import type { EventType, UUID } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

const PAGE_SIZE = 25;

const eventTypeFilters: { label: string; value: EventType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Status Change", value: "Status Change" },
  { label: "Assignment", value: "Assignment" },
  { label: "Unassignment", value: "Unassignment" },
  { label: "Committee Update", value: "Committee Update" },
  { label: "Batch Edit", value: "Batch Edit" },
  { label: "Email", value: "Email" }
];

const eventTypeBadge: Record<
  EventType,
  "success" | "warning" | "secondary" | "destructive" | "info" | "default"
> = {
  Assignment: "success",
  Unassignment: "warning",
  "Status Change": "secondary",
  "Committee Update": "default",
  "Batch Edit": "info",
  Email: "default"
};

export default function ActivityPage() {
  const eventLogsQuery = useEventLogs();
  const secMembersQuery = useSecMembers();

  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const eventLogs = useMemo(() => eventLogsQuery.data ?? [], [eventLogsQuery.data]);
  const secMembers = useMemo(() => secMembersQuery.data ?? [], [secMembersQuery.data]);
  const [expandedBatches, setExpandedBatches] = useState<Set<UUID>>(new Set());

  const secMemberMap = useMemo(() => new Map(secMembers.map((m) => [m.id, m])), [secMembers]);

  // Batch children (individual changes made in one "Edit table" submit) are nested
  // under their "Batch Edit" parent row rather than listed as top-level events.
  const topLevelLogs = useMemo(
    () => eventLogs.filter((log) => log.event_type === "Batch Edit" || !log.batch_id),
    [eventLogs]
  );
  const batchChildren = useMemo(() => {
    const map = new Map<UUID, typeof eventLogs>();
    eventLogs.forEach((log) => {
      if (log.event_type !== "Batch Edit" && log.batch_id) {
        map.set(log.batch_id, [...(map.get(log.batch_id) ?? []), log]);
      }
    });
    return map;
  }, [eventLogs]);

  const eventTypeCounts = useMemo(() => {
    const counts = new Map<EventType, number>();
    topLevelLogs.forEach((log) =>
      counts.set(log.event_type, (counts.get(log.event_type) ?? 0) + 1)
    );
    return counts;
  }, [topLevelLogs]);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = topLevelLogs;
    if (eventTypeFilter !== "all") list = list.filter((log) => log.event_type === eventTypeFilter);
    if (term) {
      const matches = (log: (typeof topLevelLogs)[number]) => {
        const actor = log.sec_member_id ? secMemberMap.get(log.sec_member_id) : null;
        const actorName = actor ? `${actor.first_name} ${actor.last_name} ${actor.email}` : "";
        return [log.details, log.target_type, actorName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      };
      // A batch parent's own details are just a summary ("changed 4
      // delegates") — also match on its children so searching for an
      // affected delegate's name still surfaces the batch it was part of.
      list = list.filter(
        (log) =>
          matches(log) ||
          (log.event_type === "Batch Edit" &&
            log.batch_id &&
            (batchChildren.get(log.batch_id) ?? []).some(matches))
      );
    }
    return list;
  }, [topLevelLogs, eventTypeFilter, searchTerm, secMemberMap, batchChildren]);

  function toggleBatch(batchId: UUID) {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }

  useEffect(() => {
    setPage(1);
  }, [eventTypeFilter, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main className="page-shell max-w-6xl space-y-6">
      {/* Page header */}
      <header className="relative overflow-hidden rounded-3xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface)] p-8 shadow-[var(--ssicsim-shadow)]">
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />
        <p className="section-eyebrow">Admin</p>
        <h1 className="section-title mt-2">Activity</h1>
        <p className="section-subtitle mt-2">
          A running log of who did what: every delegate status change, committee assignment, and
          unassignment made in the admin portal is recorded here automatically, along with which
          secretariat member made it and when.
        </p>
      </header>

      {/* Events: filters + table */}
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Filter by event type or search actor / target / details · {filteredLogs.length} of{" "}
            {topLevelLogs.length} shown
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={eventTypeFilter}
            onValueChange={(v) => setEventTypeFilter(v as EventType | "all")}
          >
            <TabsList>
              {eventTypeFilters.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                  {f.value !== "all"
                    ? ` (${eventTypeCounts.get(f.value) ?? 0})`
                    : ` (${topLevelLogs.length})`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="space-y-2 max-w-sm">
            <Label>Search</Label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Actor, target, or details"
            />
          </div>
          <Separator />
          {eventLogsQuery.isLoading ? (
            <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading…</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-sm text-[var(--ssicsim-text-muted)]">No matching events.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedLogs.map((log) => {
                    const actor = log.sec_member_id ? secMemberMap.get(log.sec_member_id) : null;
                    const isBatch = log.event_type === "Batch Edit" && log.batch_id;
                    const children = isBatch ? (batchChildren.get(log.batch_id!) ?? []) : [];
                    const isExpanded = isBatch && expandedBatches.has(log.batch_id!);
                    return (
                      <Fragment key={log.id}>
                        <TableRow>
                          <TableCell className="whitespace-nowrap text-xs text-[var(--ssicsim-text-muted)]">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : "--"}
                          </TableCell>
                          <TableCell>
                            {actor ? (
                              <>
                                <div className="font-medium">
                                  {actor.first_name} {actor.last_name}
                                </div>
                                <div className="text-xs text-[var(--ssicsim-text-muted)]">
                                  {actor.email}
                                </div>
                              </>
                            ) : (
                              <span className="text-[var(--ssicsim-text-muted)]">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={eventTypeBadge[log.event_type]}>{log.event_type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-[var(--ssicsim-text-muted)]">
                            {log.target_type ?? "--"}
                          </TableCell>
                          <TableCell className="max-w-[360px]">
                            {isBatch ? (
                              <button
                                type="button"
                                onClick={() => toggleBatch(log.batch_id!)}
                                className="flex items-center gap-1.5 font-medium text-[var(--ssicsim-brand-navy)] hover:underline"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                                {log.details ?? "--"} ({children.length})
                              </button>
                            ) : (
                              (log.details ?? "--")
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded &&
                          children.map((child) => {
                            const childActor = child.sec_member_id
                              ? secMemberMap.get(child.sec_member_id)
                              : null;
                            return (
                              <TableRow key={child.id} className="bg-[var(--ssicsim-surface-soft)]">
                                <TableCell className="whitespace-nowrap pl-8 text-xs text-[var(--ssicsim-text-muted)]">
                                  {child.timestamp
                                    ? new Date(child.timestamp).toLocaleString()
                                    : "--"}
                                </TableCell>
                                <TableCell className="text-xs text-[var(--ssicsim-text-muted)]">
                                  {childActor
                                    ? `${childActor.first_name} ${childActor.last_name}`
                                    : "Unknown"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={eventTypeBadge[child.event_type]}>
                                    {child.event_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-[var(--ssicsim-text-muted)]">
                                  {child.target_type ?? "--"}
                                </TableCell>
                                <TableCell className="max-w-[360px] text-sm">
                                  {child.details ?? "--"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[var(--ssicsim-text-muted)]">
                  Page {currentPage} of {pageCount} · {filteredLogs.length} event
                  {filteredLogs.length === 1 ? "" : "s"}
                </p>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-disabled={currentPage <= 1}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        aria-disabled={currentPage >= pageCount}
                        className={
                          currentPage >= pageCount ? "pointer-events-none opacity-50" : undefined
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
