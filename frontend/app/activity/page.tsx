"use client";

import { useEffect, useMemo, useState } from "react";

import { useEventLogs, useSecMembers } from "@/hooks/useAdminQueries";
import type { EventType } from "@/types/api";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 25;

const eventTypeFilters: { label: string; value: EventType | "all" }[] = [
  { label: "All",             value: "all" },
  { label: "Status Change",   value: "Status Change" },
  { label: "Assignment",      value: "Assignment" },
  { label: "Unassignment",    value: "Unassignment" },
  { label: "Committee Update", value: "Committee Update" },
  { label: "Email",           value: "Email" }
];

const eventTypeBadge: Record<EventType, "success" | "warning" | "secondary" | "default"> = {
  Assignment:         "success",
  Unassignment:        "warning",
  "Status Change":     "secondary",
  "Committee Update":   "default",
  Email:                "default"
};

export default function ActivityPage() {
  const eventLogsQuery  = useEventLogs();
  const secMembersQuery = useSecMembers();

  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | "all">("all");
  const [searchTerm,      setSearchTerm]      = useState("");
  const [page,            setPage]            = useState(1);

  const eventLogs  = eventLogsQuery.data  ?? [];
  const secMembers = secMembersQuery.data ?? [];

  const secMemberMap = useMemo(() => new Map(secMembers.map(m => [m.id, m])), [secMembers]);

  const eventTypeCounts = useMemo(() => {
    const counts = new Map<EventType, number>();
    eventLogs.forEach(log => counts.set(log.event_type, (counts.get(log.event_type) ?? 0) + 1));
    return counts;
  }, [eventLogs]);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = eventLogs;
    if (eventTypeFilter !== "all") list = list.filter(log => log.event_type === eventTypeFilter);
    if (term) {
      list = list.filter(log => {
        const actor = log.sec_member_id ? secMemberMap.get(log.sec_member_id) : null;
        const actorName = actor ? `${actor.first_name} ${actor.last_name} ${actor.email}` : "";
        return [log.details, log.target_type, actorName].filter(Boolean).join(" ").toLowerCase().includes(term);
      });
    }
    return list;
  }, [eventLogs, eventTypeFilter, searchTerm, secMemberMap]);

  useEffect(() => { setPage(1); }, [eventTypeFilter, searchTerm]);

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
          A running log of who did what: every delegate status change, committee assignment, and unassignment made
          in the admin portal is recorded here automatically, along with which secretariat member made it and when.
        </p>
      </header>

      {/* Events: filters + table */}
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Filter by event type or search actor / target / details · {filteredLogs.length} of {eventLogs.length} shown
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={eventTypeFilter} onValueChange={v => setEventTypeFilter(v as EventType | "all")}>
            <TabsList>
              {eventTypeFilters.map(f => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                  {f.value !== "all" ? ` (${eventTypeCounts.get(f.value) ?? 0})` : ` (${eventLogs.length})`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="space-y-2 max-w-sm">
            <Label>Search</Label>
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Actor, target, or details" />
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
                  {pagedLogs.map(log => {
                    const actor = log.sec_member_id ? secMemberMap.get(log.sec_member_id) : null;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs text-[var(--ssicsim-text-muted)]">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : "--"}
                        </TableCell>
                        <TableCell>
                          {actor ? (
                            <>
                              <div className="font-medium">{actor.first_name} {actor.last_name}</div>
                              <div className="text-xs text-[var(--ssicsim-text-muted)]">{actor.email}</div>
                            </>
                          ) : (
                            <span className="text-[var(--ssicsim-text-muted)]">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={eventTypeBadge[log.event_type]}>{log.event_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[var(--ssicsim-text-muted)]">{log.target_type ?? "--"}</TableCell>
                        <TableCell className="max-w-[360px]">{log.details ?? "--"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[var(--ssicsim-text-muted)]">
                  Page {currentPage} of {pageCount} · {filteredLogs.length} event{filteredLogs.length === 1 ? "" : "s"}
                </p>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        aria-disabled={currentPage <= 1}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                        aria-disabled={currentPage >= pageCount}
                        className={currentPage >= pageCount ? "pointer-events-none opacity-50" : undefined}
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
