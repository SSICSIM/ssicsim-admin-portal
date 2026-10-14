"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import {
  useAssignEventCharacter,
  useCreateEventCharacter,
  useCreateEventRegistration,
  useDelegates,
  useDelegations,
  useDeleteEventCharacter,
  useDeleteEventRegistration,
  useEvent,
  useEventCharacters,
  useEventRegistrations,
  useUnassignEventCharacter,
  useUpdateEvent,
  useUpdateEventRegistration
} from "@/hooks/useAdminQueries";
import type {
  CharacterExperience,
  DelegationOut,
  EventOut,
  EventRegistrationOut,
  EventRegistrationStatus,
  UUID
} from "@/types/api";
import { CharacterOptionLabel } from "@/components/CharacterOptionLabel";
import { SortableHead, delegateDisplayName } from "@/components/DelegateTable";
import { PageHeader, PageShell } from "@/components/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildEventCharacterRows,
  buildEventRegistrationRows,
  downloadCsv,
  parseCharacterMatrix
} from "@/utils/csv";
import {
  EVENT_STATUSES,
  answerFields,
  eventStatusBadge,
  formatAnswer,
  MIDNIGHT_CRISIS_TEMPLATES,
  emailerLink,
  isAttending,
  statusesFor
} from "@/utils/events";

type SortKey = "name" | "grade" | "experience" | "delegation" | "eventStatus" | "registered";

function formatDateTime(value: string | null): string {
  if (!value) return "--";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  // apiClient errors look like `Request failed (409): {"detail":"..."}`
  const match = error.message.match(/\{.*\}$/);
  if (match) {
    try {
      const detail = JSON.parse(match[0]).detail;
      if (typeof detail === "string") return detail;
      if (detail?.message) return detail.message;
    } catch {
      // fall through
    }
  }
  return error.message || fallback;
}

function Field({ label, value, span }: { label: string; value: ReactNode; span?: boolean }) {
  return (
    <div className={span ? "space-y-1 sm:col-span-2" : "space-y-1"}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ssicsim-text-muted)]">
        {label}
      </p>
      <p className="text-sm text-[var(--ssicsim-text)] whitespace-pre-wrap break-words">
        {value === "" || value == null ? "--" : value}
      </p>
    </div>
  );
}

// ─── event settings ───────────────────────────────────────────────────────────

function EventSettings({ event }: { event: EventOut }) {
  const updateEvent = useUpdateEvent(event.slug);
  const [capacity, setCapacity] = useState(event.capacity == null ? "" : String(event.capacity));
  const [error, setError] = useState<string | null>(null);

  const save = async (payload: Parameters<typeof updateEvent.mutateAsync>[0]) => {
    setError(null);
    try {
      await updateEvent.mutateAsync(payload);
    } catch (e) {
      setError(errorMessage(e, "Unable to update event."));
    }
  };

  const capacityValue = capacity.trim() === "" ? null : Number.parseInt(capacity, 10);
  const capacityChanged = capacityValue !== event.capacity && !Number.isNaN(capacityValue);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-36 space-y-2">
        <Label htmlFor="event-capacity">
          {event.sessions.length > 0 ? "Capacity / session" : "Capacity"}
        </Label>
        <Input
          id="event-capacity"
          type="number"
          min={0}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Unlimited"
        />
      </div>
      <Button
        variant="secondary"
        disabled={!capacityChanged || updateEvent.isPending}
        onClick={() => save({ capacity: capacityValue })}
      >
        Save capacity
      </Button>
      <Button
        variant={event.registration_open ? "ghost" : "default"}
        disabled={updateEvent.isPending}
        onClick={() => save({ registration_open: !event.registration_open })}
      >
        {event.registration_open ? "Close registration" : "Reopen registration"}
      </Button>
      {error ? <Badge variant="warning">{error}</Badge> : null}
    </div>
  );
}

// ─── add delegate dialog ──────────────────────────────────────────────────────

function AddDelegateDialog({
  event,
  open,
  onOpenChange,
  registeredDelegateIds
}: {
  event: EventOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registeredDelegateIds: Set<UUID>;
}) {
  const delegatesQuery = useDelegates();
  const createRegistration = useCreateEventRegistration(event.slug);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EventRegistrationStatus>(
    event.has_characters ? "Accepted" : "Registered"
  );
  const [session, setSession] = useState(event.sessions[0]?.key ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (delegatesQuery.data ?? [])
      .filter((d) => !registeredDelegateIds.has(d.id))
      .filter(
        (d) =>
          !term ||
          `${d.first_name} ${d.last_name} ${d.preferred_name ?? ""} ${d.email}`
            .toLowerCase()
            .includes(term)
      )
      .slice(0, 8);
  }, [delegatesQuery.data, registeredDelegateIds, search]);

  const add = async (delegateId: UUID, name: string) => {
    setError(null);
    setMessage(null);
    try {
      await createRegistration.mutateAsync({
        delegate_id: delegateId,
        status,
        answers: event.sessions.length > 0 ? { session } : {}
      });
      setMessage(`Added ${name}.`);
    } catch (e) {
      setError(errorMessage(e, "Unable to add delegate."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add delegate to {event.name}</DialogTitle>
          <DialogDescription>
            Adds an existing delegate directly, skipping the website checks and capacity limit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EventRegistrationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusesFor(event.slug).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {event.sessions.length > 0 && (
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={session} onValueChange={setSession}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {event.sessions.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search delegates by name or email"
            autoFocus
          />
          <div className="space-y-2">
            {candidates.length === 0 ? (
              <p className="text-sm text-[var(--ssicsim-text-muted)]">No matching delegates.</p>
            ) : (
              candidates.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--ssicsim-border)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--ssicsim-brand-navy)]">
                      {delegateDisplayName(d)}
                    </p>
                    <p className="truncate text-xs text-[var(--ssicsim-text-muted)]">
                      {d.email} · {d.delegate_status}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={createRegistration.isPending}
                    onClick={() => add(d.id, delegateDisplayName(d))}
                  >
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {message ? <Badge variant="success">{message}</Badge> : null}
            {error ? <Badge variant="warning">{error}</Badge> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── view dialog ──────────────────────────────────────────────────────────────

function RegistrationViewDialog({
  event,
  registration,
  delegationName,
  onClose
}: {
  event: EventOut;
  registration: EventRegistrationOut | null;
  delegationName: string;
  onClose: () => void;
}) {
  const d = registration?.delegate;
  return (
    <Dialog open={Boolean(registration)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {registration && d ? (
          <>
            <DialogHeader>
              <DialogTitle>{d.full_name || `${d.first_name} ${d.last_name}`}</DialogTitle>
              <DialogDescription>
                {event.name} · {registration.status}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred name" value={d.preferred_name} />
              <Field label="Email" value={d.email} />
              <Field label="Phone" value={d.phone} />
              <Field label="Grade" value={d.grade} />
              <Field label="Experience" value={d.delegate_experience} />
              <Field label="Delegation" value={delegationName} />
              <Field label="Conference status" value={d.delegate_status} />
              <Field label="Registered" value={formatDateTime(registration.created_at)} />
              <Field
                label="Name entered on form"
                value={[registration.submitted_first_name, registration.submitted_last_name]
                  .filter(Boolean)
                  .join(" ")}
              />
              {event.has_characters && (
                <Field label="Character" value={registration.character?.name} />
              )}
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              {answerFields(event.slug).map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  value={formatAnswer(event, registration, f.key)}
                  span={f.key === "motivation" || f.key === "dietary_details"}
                />
              ))}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ─── registrations tab ────────────────────────────────────────────────────────

function RegistrationsTab({
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
  const deleteRegistration = useDeleteEventRegistration(event.slug);
  const [statusFilter, setStatusFilter] = useState<EventRegistrationStatus | "all">("all");
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("registered");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [viewing, setViewing] = useState<EventRegistrationOut | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<UUID | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tableFields = answerFields(event.slug).filter((f) => f.inTable);
  const delegationName = (r: EventRegistrationOut) =>
    r.delegate.delegation_id
      ? (delegationsById.get(r.delegate.delegation_id)?.name ?? "--")
      : "Independent";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return registrations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (sessionFilter !== "all" && r.answers?.session !== sessionFilter) return false;
      if (term) {
        const d = r.delegate;
        const haystack =
          `${d.first_name} ${d.last_name} ${d.preferred_name ?? ""} ${d.email}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [registrations, statusFilter, sessionFilter, search]);

  const sorted = useMemo(() => {
    const value = (r: EventRegistrationOut): string => {
      const d = r.delegate;
      switch (sortKey) {
        case "name":
          return `${d.last_name} ${d.first_name}`.toLowerCase();
        case "grade":
          return d.grade ?? "";
        case "experience":
          return d.delegate_experience;
        case "delegation":
          return delegationName(r).toLowerCase();
        case "eventStatus":
          return r.status;
        case "registered":
          return r.created_at ?? "";
      }
    };
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => value(a).localeCompare(value(b)) * dir);
    // delegationName only depends on delegationsById
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, sortDir, delegationsById]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const setStatus = async (r: EventRegistrationOut, status: EventRegistrationStatus) => {
    setError(null);
    try {
      await updateRegistration.mutateAsync({ id: r.id, data: { status } });
    } catch (e) {
      setError(errorMessage(e, "Unable to update status."));
    }
  };

  const remove = async (id: UUID) => {
    setError(null);
    try {
      await deleteRegistration.mutateAsync(id);
    } catch (e) {
      setError(errorMessage(e, "Unable to remove registration."));
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const exportCsv = () => {
    const { headers, rows } = buildEventRegistrationRows(event, sorted, delegationsById);
    const suffix = statusFilter === "all" ? "" : `-${statusFilter.toLowerCase()}`;
    downloadCsv(`${event.slug}-registrations${suffix}.csv`, headers, rows);
  };

  const headProps = { activeKey: sortKey, activeDir: sortDir, onSort: toggleSort };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44 space-y-2">
            <Label>Event status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as EventRegistrationStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusesFor(event.slug).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {event.sessions.length > 0 && (
            <div className="w-64 space-y-2">
              <Label>Session</Label>
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sessions</SelectItem>
                  {event.sessions.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email"
            />
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {event.has_characters ? (
              <>
                <Button asChild variant="secondary">
                  <Link
                    href={emailerLink(event.slug, "Accepted", MIDNIGHT_CRISIS_TEMPLATES.Accepted)}
                  >
                    Email accepted ({event.counts.Accepted ?? 0})
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link
                    href={emailerLink(event.slug, "Rejected", MIDNIGHT_CRISIS_TEMPLATES.Rejected)}
                  >
                    Email rejected ({event.counts.Rejected ?? 0})
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="secondary">
                <Link href={emailerLink(event.slug, "attending")}>Email attendees</Link>
              </Button>
            )}
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              Add delegate
            </Button>
            <Button variant="ghost" onClick={exportCsv} disabled={sorted.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
        {error ? <Badge variant="warning">{error}</Badge> : null}
        <Separator />
        {isLoading ? (
          <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-[var(--ssicsim-text-muted)]">
            {registrations.length === 0
              ? "No one has registered yet."
              : "No registrations match these filters."}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Delegate" sortKeyName="name" {...headProps} />
                  <SortableHead label="Grade" sortKeyName="grade" {...headProps} />
                  <TableHead>Email</TableHead>
                  <SortableHead label="Experience" sortKeyName="experience" {...headProps} />
                  <SortableHead label="Delegation" sortKeyName="delegation" {...headProps} />
                  <SortableHead label="Event status" sortKeyName="eventStatus" {...headProps} />
                  {tableFields.map((f) => (
                    <TableHead key={f.key}>{f.label}</TableHead>
                  ))}
                  {event.has_characters && <TableHead>Character</TableHead>}
                  <SortableHead label="Registered" sortKeyName="registered" {...headProps} />
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r) => {
                  const d = r.delegate;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{delegateDisplayName(d)}</TableCell>
                      <TableCell>{d.grade ?? "--"}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{d.email}</TableCell>
                      <TableCell>{d.delegate_experience}</TableCell>
                      <TableCell>{delegationName(r)}</TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={(v) => setStatus(r, v as EventRegistrationStatus)}
                          disabled={updateRegistration.isPending}
                        >
                          <SelectTrigger className="h-8 w-full min-w-[130px] [&>span]:whitespace-nowrap">
                            <Badge variant={eventStatusBadge[r.status]}>{r.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {statusesFor(event.slug).map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {tableFields.map((f) => {
                        const text = formatAnswer(event, r, f.key);
                        return (
                          <TableCell
                            key={f.key}
                            className="max-w-[220px] truncate text-xs"
                            title={text}
                          >
                            {text || "--"}
                          </TableCell>
                        );
                      })}
                      {event.has_characters && <TableCell>{r.character?.name ?? "--"}</TableCell>}
                      <TableCell className="whitespace-nowrap text-xs text-[var(--ssicsim-text-muted)]">
                        {formatDateTime(r.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              aria-label="Row actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setTimeout(() => setViewing(r), 0);
                              }}
                            >
                              View
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {confirmDeleteId === r.id ? (
                              <DropdownMenuItem
                                onSelect={() => remove(r.id)}
                                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                              >
                                Confirm remove
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setConfirmDeleteId(r.id);
                                }}
                                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                              >
                                Remove from event
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="text-xs text-[var(--ssicsim-text-muted)]">
              {sorted.length} registration{sorted.length === 1 ? "" : "s"}
            </p>
          </>
        )}
      </CardContent>
      <AddDelegateDialog
        event={event}
        open={addOpen}
        onOpenChange={setAddOpen}
        registeredDelegateIds={new Set(registrations.map((r) => r.delegate_id))}
      />
      <RegistrationViewDialog
        event={event}
        registration={viewing}
        delegationName={viewing ? delegationName(viewing) : ""}
        onClose={() => setViewing(null)}
      />
    </Card>
  );
}

// ─── characters tab (Midnight Crisis) ─────────────────────────────────────────

const EXPERIENCES: CharacterExperience[] = ["Beginner", "Intermediate", "Advanced"];

function CharactersTab({
  event,
  registrations
}: {
  event: EventOut;
  registrations: EventRegistrationOut[];
}) {
  const charactersQuery = useEventCharacters(event.slug);
  const createCharacter = useCreateEventCharacter(event.slug);
  const deleteCharacter = useDeleteEventCharacter(event.slug);
  const assignCharacter = useAssignEventCharacter(event.slug);
  const unassignCharacter = useUnassignEventCharacter(event.slug);

  const [name, setName] = useState("");
  const [priority, setPriority] = useState("");
  const [experience, setExperience] = useState<CharacterExperience[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const characters = useMemo(() => charactersQuery.data ?? [], [charactersQuery.data]);
  const registrationById = useMemo(
    () => new Map(registrations.map((r) => [r.id, r])),
    [registrations]
  );
  // Accepted registrants without a character yet
  const unassigned = useMemo(
    () => registrations.filter((r) => isAttending(r.status) && !r.character),
    [registrations]
  );
  const filled = characters.filter((c) => c.registration_id).length;

  const run = async (fn: () => Promise<unknown>, success: string | null, fallback: string) => {
    setError(null);
    setMessage(null);
    try {
      await fn();
      if (success) setMessage(success);
    } catch (e) {
      setError(errorMessage(e, fallback));
    }
  };

  const addCharacter = () => {
    const parsed = priority.trim() ? Number.parseInt(priority, 10) : null;
    if (parsed != null && (Number.isNaN(parsed) || parsed < 1 || parsed > 5)) {
      setError("Priority must be between 1 and 5.");
      return;
    }
    run(
      async () => {
        await createCharacter.mutateAsync({ name: name.trim(), priority: parsed, experience });
        setName("");
        setPriority("");
        setExperience([]);
      },
      "Character added.",
      "Unable to add character."
    );
  };

  const uploadCsv = () => {
    if (!csvFile) return;
    run(
      async () => {
        const { characters: entries, warnings } = await parseCharacterMatrix(csvFile);
        setCsvWarnings(warnings);
        if (entries.length === 0) throw new Error("CSV file contained no character names.");
        let added = 0;
        let skipped = 0;
        for (const entry of entries) {
          try {
            await createCharacter.mutateAsync(entry);
            added += 1;
          } catch {
            skipped += 1;
          }
        }
        setCsvFile(null);
        setMessage(
          `Uploaded ${added} character${added === 1 ? "" : "s"}` +
            (skipped ? ` (${skipped} skipped as duplicates).` : ".")
        );
      },
      null,
      "Unable to parse CSV."
    );
  };

  const exportCsv = () => {
    const { headers, rows } = buildEventCharacterRows(characters, registrations);
    downloadCsv(`${event.slug}-characters.csv`, headers, rows);
  };

  const sortedCharacters = useMemo(
    () =>
      [...characters].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name)
      ),
    [characters]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Character Matrix CSV</CardTitle>
          <CardDescription>
            Same format as committees: header must include{" "}
            <span className="font-semibold text-[var(--ssicsim-brand-navy)]">character_name</span>,
            with optional <span className="font-semibold">priority</span> (1-5) and{" "}
            <span className="font-semibold">experience</span> columns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={uploadCsv}
              disabled={!csvFile || createCharacter.isPending}
            >
              {createCharacter.isPending ? "Uploading..." : "Upload CSV"}
            </Button>
            <Button
              variant="secondary"
              className="bg-[var(--ssicsim-brand-gold-soft)] hover:bg-[var(--ssicsim-brand-gold)]/20"
              onClick={exportCsv}
              disabled={characters.length === 0}
            >
              Export Characters CSV
            </Button>
          </div>
          {csvWarnings.length > 0 && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTitle>{csvWarnings.length} row(s) had issues</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {csvWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Characters & Assignments</CardTitle>
          <CardDescription>
            {filled} of {characters.length} characters assigned · {unassigned.length} accepted
            delegate{unassigned.length === 1 ? "" : "s"} without a character. Only Accepted
            delegates can be assigned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1 space-y-2">
              <Label htmlFor="event-character-name">Add character</Label>
              <Input
                id="event-character-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    e.preventDefault();
                    addCharacter();
                  }
                }}
                placeholder="Character name"
              />
            </div>
            <div className="w-28 space-y-2">
              <Label htmlFor="event-character-priority">Priority</Label>
              <Input
                id="event-character-priority"
                type="number"
                min={1}
                max={5}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="1-5"
              />
            </div>
            <div className="space-y-2">
              <Label>Experience (select any that apply)</Label>
              <div className="flex flex-wrap gap-4">
                {EXPERIENCES.map((level) => (
                  <label key={level} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={experience.includes(level)}
                      onCheckedChange={() =>
                        setExperience((prev) =>
                          prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
                        )
                      }
                    />
                    {level}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={addCharacter} disabled={!name.trim() || createCharacter.isPending}>
              {createCharacter.isPending ? "Adding..." : "Add character"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {message ? <Badge variant="success">{message}</Badge> : null}
            {error ? <Badge variant="warning">{error}</Badge> : null}
          </div>

          {charactersQuery.isLoading ? (
            <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading…</p>
          ) : characters.length === 0 ? (
            <p className="text-sm text-[var(--ssicsim-text-muted)]">No characters yet.</p>
          ) : (
            <div className="rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-3">
              <div className="grid gap-2 text-sm">
                {sortedCharacters.map((character) => {
                  const holder = character.registration_id
                    ? registrationById.get(character.registration_id)
                    : undefined;
                  return (
                    <div
                      key={character.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] px-3 py-2 transition-colors hover:border-[var(--ssicsim-brand-gold)]/50"
                    >
                      <div>
                        <p className="font-medium text-[var(--ssicsim-brand-navy)]">
                          <CharacterOptionLabel character={character} />
                        </p>
                        <p className="mt-1 text-xs text-[var(--ssicsim-text-muted)]">
                          Assigned to:{" "}
                          {holder
                            ? `${delegateDisplayName(holder.delegate)} · ${holder.delegate.delegate_experience}`
                            : "--"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {holder ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={unassignCharacter.isPending}
                            onClick={() =>
                              run(
                                () => unassignCharacter.mutateAsync(character.id),
                                null,
                                "Unable to unassign."
                              )
                            }
                          >
                            Unassign
                          </Button>
                        ) : (
                          <>
                            <Select
                              value=""
                              onValueChange={(registrationId) =>
                                run(
                                  () =>
                                    assignCharacter.mutateAsync({
                                      characterId: character.id,
                                      registrationId
                                    }),
                                  null,
                                  "Unable to assign."
                                )
                              }
                              disabled={unassigned.length === 0 || assignCharacter.isPending}
                            >
                              <SelectTrigger className="h-8 w-56">
                                <SelectValue
                                  placeholder={
                                    unassigned.length === 0 ? "No one to assign" : "Assign delegate"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {unassigned.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {delegateDisplayName(r.delegate)} ·{" "}
                                    {r.delegate.delegate_experience}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={deleteCharacter.isPending}
                              onClick={() =>
                                run(
                                  () => deleteCharacter.mutateAsync(character.id),
                                  null,
                                  "Unable to remove character."
                                )
                              }
                            >
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const eventQuery = useEvent(slug);
  const registrationsQuery = useEventRegistrations(slug);
  const delegationsQuery = useDelegations();

  const event = eventQuery.data;
  const registrations = useMemo(() => registrationsQuery.data ?? [], [registrationsQuery.data]);
  const delegationsById = useMemo(
    () => new Map((delegationsQuery.data ?? []).map((d) => [d.id, d])),
    [delegationsQuery.data]
  );

  if (eventQuery.isLoading) {
    return (
      <PageShell>
        <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading event…</p>
      </PageShell>
    );
  }
  if (!event) {
    return (
      <PageShell>
        <p className="text-sm text-red-700">Event not found.</p>
        <Button asChild variant="secondary">
          <Link href="/events">Back to events</Link>
        </Button>
      </PageShell>
    );
  }

  const countSummary = EVENT_STATUSES.filter((s) => event.counts[s])
    .map((s) => `${event.counts[s]} ${s.toLowerCase()}`)
    .join(" · ");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Events"
        title={event.name}
        description={
          <>
            {event.capacity == null
              ? `${event.filled} attending`
              : event.sessions.length > 0
                ? event.sessions
                    .map(
                      (s) =>
                        `${s.label}: ${s.filled}${s.capacity == null ? "" : ` / ${s.capacity}`}`
                    )
                    .join(" · ")
                : `${event.filled} / ${event.capacity} spots filled`}
            {countSummary ? ` — ${countSummary}` : ""}
          </>
        }
        action={
          <Button asChild variant="ghost">
            <Link href="/events">All events</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <EventSettings key={`${event.capacity}-${event.registration_open}`} event={event} />
        </CardContent>
      </Card>

      {event.has_characters ? (
        <Tabs defaultValue="registrations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="characters">Characters & Assignments</TabsTrigger>
          </TabsList>
          <TabsContent value="registrations">
            <RegistrationsTab
              event={event}
              registrations={registrations}
              delegationsById={delegationsById}
              isLoading={registrationsQuery.isLoading}
            />
          </TabsContent>
          <TabsContent value="characters">
            <CharactersTab event={event} registrations={registrations} />
          </TabsContent>
        </Tabs>
      ) : (
        <RegistrationsTab
          event={event}
          registrations={registrations}
          delegationsById={delegationsById}
          isLoading={registrationsQuery.isLoading}
        />
      )}
    </PageShell>
  );
}
