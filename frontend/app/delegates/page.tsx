"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";

import {
  useAssignDelegate,
  useCharacters,
  useCommittees,
  useDeleteAssignment,
  useDeleteDelegate,
  useDelegates,
  useDelegations,
  useUpdateAssignment,
  useUpdateDelegate,
  useUpdateDelegation
} from "@/hooks/useAdminQueries";
import type { DelegateOut, DelegateStatus, DelegateUpdate, DelegationOut, DelegationUpdate, UUID } from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// ─── constants ────────────────────────────────────────────────────────────────

const statusFilters: { label: string; value: DelegateStatus | "all" }[] = [
  { label: "All delegates",       value: "all" },
  { label: "Awaiting payment",    value: "Awaiting Payment" },
  { label: "Awaiting assignment", value: "Awaiting Assignment" },
  { label: "Assigned",            value: "Assigned" },
  { label: "Confirmed",           value: "Confirmed" }
];

const statusBadge: Record<DelegateStatus, "success" | "warning" | "secondary" | "destructive" | "info"> = {
  "Awaiting Payment":    "destructive",
  "Awaiting Assignment": "info",
  Assigned:              "warning",
  Confirmed:             "success"
};

// ─── undo toast ───────────────────────────────────────────────────────────────

const UNDO_WINDOW_MS = 5_000;

type PreviousAssignment = {
  characterId: UUID;
  characterName: string;
  committeeId: UUID;
  committeeName: string;
  previousStatus: DelegateStatus;
};

type PendingUnassign = {
  uid: string;
  delegateId: UUID;
  delegateName: string;
  characterName: string;
  committeeName: string;
  expiresAt: number;
};

function UnassignToast({ pending, onUndo }: { pending: PendingUnassign; onUndo: () => void }) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, pending.expiresAt - Date.now()));

  useEffect(() => {
    const iv = setInterval(() => setMsLeft(Math.max(0, pending.expiresAt - Date.now())), 80);
    return () => clearInterval(iv);
  }, [pending.expiresAt]);

  return (
    <div className="w-72 overflow-hidden rounded-xl border border-[var(--ssicsim-border)] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-[var(--ssicsim-brand-navy)]">
          Unassigned {pending.delegateName}
        </p>
        {pending.characterName && (
          <p className="mt-0.5 text-xs text-[var(--ssicsim-text-muted)]">
            {pending.committeeName} — {pending.characterName}
          </p>
        )}
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={onUndo}>
            Undo
          </Button>
        </div>
      </div>
      {/* Draining progress bar */}
      <div className="h-1 bg-[var(--ssicsim-bg-soft)]">
        <div
          className="h-full bg-[var(--ssicsim-brand-gold)] transition-[width] duration-75"
          style={{ width: `${(msLeft / UNDO_WINDOW_MS) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── sorting ──────────────────────────────────────────────────────────────────

type SortKey = "name" | "grade" | "status" | "experience" | "delegation" | "committee" | "character" | "submitted";

function SortableHead({
  label,
  sortKeyName,
  activeKey,
  activeDir,
  onSort
}: {
  label: string;
  sortKeyName: SortKey;
  activeKey: SortKey;
  activeDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeKey === sortKeyName;
  return (
    <TableHead className="cursor-pointer select-none" onClick={() => onSort(sortKeyName)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          activeDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : null}
      </span>
    </TableHead>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "--";
  return new Date(value).toLocaleDateString();
}

// ─── shared table row ─────────────────────────────────────────────────────────

function DelegateRow({
  delegate,
  assignedCommittee,
  assignedCharacter,
  delegationName,
  onEdit,
  onAssign,
  onUnassign,
  onDelete,
  unassigning,
  isPendingUnassign
}: {
  delegate: DelegateOut;
  assignedCommittee: string | null;
  assignedCharacter: string | null;
  delegationName: string;
  onEdit: () => void;
  onAssign: () => void;
  onUnassign: () => void;
  onDelete: () => void;
  unassigning: boolean;
  isPendingUnassign: boolean;
}) {
  return (
    <TableRow className={isPendingUnassign ? "opacity-40" : undefined}>
      <TableCell className="font-medium">{delegate.last_name}, {delegate.first_name}</TableCell>
      <TableCell>{delegate.preferred_name ?? "--"}</TableCell>
      <TableCell>{delegate.grade ?? "--"}</TableCell>
      <TableCell className="max-w-[160px] truncate">{delegate.email}</TableCell>
      <TableCell>
        <Badge variant={statusBadge[delegate.delegate_status]}>
          {delegate.delegate_status}
        </Badge>
      </TableCell>
      <TableCell>{delegate.delegate_experience}</TableCell>
      <TableCell>{delegationName}</TableCell>
      <TableCell>{assignedCommittee ?? "--"}</TableCell>
      <TableCell>{assignedCharacter ?? "--"}</TableCell>
      <TableCell className="whitespace-nowrap text-xs text-[var(--ssicsim-text-muted)]">{formatDate(delegate.date_applied)}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Row actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={e => { e.preventDefault(); setTimeout(onAssign, 0); }}
              disabled={delegate.delegate_status === "Awaiting Payment"}
              title={delegate.delegate_status === "Awaiting Payment" ? "Payment required before assignment" : undefined}
            >
              {delegate.delegate_status === "Awaiting Assignment" ? "Assign" : "Reassign"}
            </DropdownMenuItem>
            {(delegate.delegate_status === "Assigned" || delegate.delegate_status === "Confirmed") && (
              <DropdownMenuItem
                onSelect={e => { e.preventDefault(); setTimeout(onUnassign, 0); }}
                disabled={unassigning || isPendingUnassign}
              >
                {isPendingUnassign ? "Undoing…" : "Unassign"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={e => { e.preventDefault(); setTimeout(onEdit, 0); }}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={e => { e.preventDefault(); setTimeout(onDelete, 0); }}
              className="text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ─── table head shared ────────────────────────────────────────────────────────

function DelegateTableHead({
  sortKey,
  sortDir,
  onSort
}: {
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  return (
    <TableHeader>
      <TableRow>
        <SortableHead label="Delegate" sortKeyName="name" activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
        <TableHead>Preferred</TableHead>
        <SortableHead label="Grade" sortKeyName="grade" activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
        <TableHead>Email</TableHead>
        <SortableHead label="Status" sortKeyName="status" activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
        <SortableHead label="Experience" sortKeyName="experience" activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
        <SortableHead label="Delegation" sortKeyName="delegation" activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
        <SortableHead label="Committee" sortKeyName="committee" activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
        <SortableHead label="Character" sortKeyName="character" activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
        <SortableHead label="Submitted" sortKeyName="submitted" activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
        <TableHead></TableHead>
      </TableRow>
    </TableHeader>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function DelegatesPage() {
  const committeesQuery  = useCommittees();
  const charactersQuery  = useCharacters();
  const delegatesQuery   = useDelegates();
  const delegationsQuery  = useDelegations();
  const assignDelegate    = useAssignDelegate();
  const deleteAssignment  = useDeleteAssignment();
  const updateDelegate    = useUpdateDelegate();
  const deleteDelegate    = useDeleteDelegate();
  const updateDelegation  = useUpdateDelegation();

  // ── filters ────────────────────────────────────────────────────────────────
  const [statusFilter,     setStatusFilter]     = useState<DelegateStatus | "all">("all");
  const [committeeFilterId, setCommitteeFilterId] = useState<UUID | "all">("all");
  const [searchTerm,       setSearchTerm]       = useState("");

  // ── sorting & pagination ───────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>("submitted");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 25;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  // ── assignment flow ────────────────────────────────────────────────────────
  const [assignmentOpen,       setAssignmentOpen]       = useState(false);
  const [assignmentDelegateId, setAssignmentDelegateId] = useState<UUID | null>(null);
  const [flowOpen,             setFlowOpen]             = useState(false);
  const [flowIndex,            setFlowIndex]            = useState(0);
  const [committeeId,          setCommitteeId]          = useState<UUID | "">("");
  const [characterId,          setCharacterId]          = useState<UUID | "">("");
  const [submitMessage,        setSubmitMessage]        = useState<string | null>(null);
  const [submitError,          setSubmitError]          = useState<string | null>(null);
  const updateAssignment = useUpdateAssignment(assignmentDelegateId ?? "");

  // ── undo unassign ──────────────────────────────────────────────────────────
  const [pendingUnassigns, setPendingUnassigns] = useState<PendingUnassign[]>([]);
  const timers              = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const previousAssignments = useRef<Map<UUID, PreviousAssignment>>(new Map());

  useEffect(() => {
    const t = timers.current;
    return () => { t.forEach(clearTimeout); };
  }, []);

  // ── delegate edit dialog ───────────────────────────────────────────────────
  const [editDelegate, setEditDelegate] = useState<DelegateOut | null>(null);
  const [editDraft,    setEditDraft]    = useState<DelegateUpdate>({});
  const [editError,    setEditError]    = useState<string | null>(null);

  // ── delete confirm dialog ──────────────────────────────────────────────────
  const [deleteConfirmDelegate, setDeleteConfirmDelegate] = useState<DelegateOut | null>(null);
  const [deleteError,           setDeleteError]           = useState<string | null>(null);

  // ── delegation edit dialog ─────────────────────────────────────────────────
  const [editDelegation,      setEditDelegation]      = useState<DelegationOut | null>(null);
  const [editDelegationDraft, setEditDelegationDraft] = useState<DelegationUpdate>({});
  const [editDelegationError, setEditDelegationError] = useState<string | null>(null);

  // ── derived data ───────────────────────────────────────────────────────────
  const committees  = committeesQuery.data  ?? [];
  const characters  = charactersQuery.data  ?? [];
  const delegates   = delegatesQuery.data   ?? [];
  const delegations = delegationsQuery.data ?? [];

  const committeeMap  = useMemo(() => new Map(committees.map(c => [c.id, c])),  [committees]);
  const delegateMap   = useMemo(() => new Map(delegates.map(d => [d.id, d])),   [delegates]);
  const delegationMap = useMemo(() => new Map(delegations.map(d => [d.id, d])), [delegations]);

  const assignedCharacterByDelegateId = useMemo(() => {
    const map = new Map<UUID, typeof characters[number]>();
    characters.forEach(c => { if (c.delegate_id) map.set(c.delegate_id, c); });
    return map;
  }, [characters]);

  const filteredDelegates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = term
      ? delegates.filter(d =>
          [d.first_name, d.last_name, d.full_name, d.preferred_name, d.email]
            .filter(Boolean).join(" ").toLowerCase().includes(term)
        )
      : delegates;
    if (statusFilter !== "all") list = list.filter(d => d.delegate_status === statusFilter);
    if (committeeFilterId !== "all") {
      list = list.filter(d => {
        const ch = assignedCharacterByDelegateId.get(d.id);
        return ch?.committee_id === committeeFilterId;
      });
    }
    return list;
  }, [delegates, searchTerm, statusFilter, committeeFilterId, assignedCharacterByDelegateId]);

  const needsAssignment = useMemo(
    () => filteredDelegates.filter(d => d.delegate_status === "Awaiting Assignment"),
    [filteredDelegates]
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<DelegateStatus, number>();
    delegates.forEach(d => counts.set(d.delegate_status, (counts.get(d.delegate_status) ?? 0) + 1));
    return counts;
  }, [delegates]);

  function sortValue(d: DelegateOut, key: SortKey): string {
    switch (key) {
      case "name": return `${d.last_name}, ${d.first_name}`.toLowerCase();
      case "grade": return d.grade ?? "";
      case "status": return d.delegate_status;
      case "experience": return d.delegate_experience;
      case "delegation": return delegationMap.get(d.delegation_id ?? "")?.name ?? "Independent Delegate";
      case "committee": {
        const ch = assignedCharacterByDelegateId.get(d.id);
        return ch ? committeeMap.get(ch.committee_id)?.name ?? "" : "";
      }
      case "character": return assignedCharacterByDelegateId.get(d.id)?.name ?? "";
      case "submitted": return d.date_applied ?? "";
    }
  }

  const sortedDelegates = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredDelegates].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }, [filteredDelegates, sortKey, sortDir, delegationMap, assignedCharacterByDelegateId, committeeMap]);

  useEffect(() => { setPage(1); }, [statusFilter, committeeFilterId, searchTerm, sortKey, sortDir]);

  const pageCount    = Math.max(1, Math.ceil(sortedDelegates.length / PAGE_SIZE));
  const currentPage  = Math.min(page, pageCount);
  const pagedDelegates = sortedDelegates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filteredCharacters = useMemo(() =>
    characters.filter(c => (!committeeId || c.committee_id === committeeId) && c.delegate_id == null),
    [characters, committeeId]
  );

  const committeeStats = useMemo(() =>
    committees.map(c => {
      const cc = characters.filter(ch => ch.committee_id === c.id);
      const assigned = cc.filter(ch => ch.delegate_id != null).length;
      return { id: c.id, name: c.name, openCount: cc.length - assigned, occupiedPercent: cc.length ? Math.round(assigned / cc.length * 100) : 0 };
    }), [committees, characters]
  );

  // ── helpers ────────────────────────────────────────────────────────────────

  function rowProps(delegate: DelegateOut) {
    const ch  = assignedCharacterByDelegateId.get(delegate.id);
    const com = ch ? committeeMap.get(ch.committee_id)?.name ?? null : null;
    return {
      delegate,
      assignedCommittee:  com,
      assignedCharacter:  ch?.name ?? null,
      delegationName:     delegationMap.get(delegate.delegation_id ?? "")?.name ?? "Independent Delegate",
      onEdit:             () => openEdit(delegate),
      onAssign:           () => openAssignment(delegate.id),
      onUnassign:         () => startUnassign(delegate.id),
      onDelete:           () => { setDeleteConfirmDelegate(delegate); setDeleteError(null); },
      unassigning:        false,
      isPendingUnassign:  pendingUnassigns.some(p => p.delegateId === delegate.id)
    };
  }

  // ── unassign with undo ─────────────────────────────────────────────────────

  function startUnassign(delegateId: UUID) {
    const delegate  = delegateMap.get(delegateId);
    const ch        = assignedCharacterByDelegateId.get(delegateId);
    const committee = ch ? committeeMap.get(ch.committee_id) : null;
    const uid       = crypto.randomUUID();

    // Remember what they were assigned to so we can detect a same-character restore
    if (ch && delegate) {
      previousAssignments.current.set(delegateId, {
        characterId:    ch.id,
        characterName:  ch.name,
        committeeId:    ch.committee_id,
        committeeName:  committee?.name ?? "",
        previousStatus: delegate.delegate_status
      });
    }

    const pending: PendingUnassign = {
      uid,
      delegateId,
      delegateName:  `${delegate?.preferred_name ?? delegate?.first_name ?? ""} ${delegate?.last_name ?? ""}`.trim(),
      characterName: ch?.name ?? "",
      committeeName: committee?.name ?? "",
      expiresAt:     Date.now() + UNDO_WINDOW_MS
    };

    setPendingUnassigns(prev => [...prev, pending]);

    const timer = setTimeout(async () => {
      try { await deleteAssignment.mutateAsync(delegateId); } catch { /* ignore */ }
      setPendingUnassigns(prev => prev.filter(p => p.uid !== uid));
      timers.current.delete(uid);
    }, UNDO_WINDOW_MS);

    timers.current.set(uid, timer);
  }

  function undoUnassign(uid: string) {
    const pending = pendingUnassigns.find(p => p.uid === uid);
    if (pending) previousAssignments.current.delete(pending.delegateId);
    const timer = timers.current.get(uid);
    if (timer) clearTimeout(timer);
    timers.current.delete(uid);
    setPendingUnassigns(prev => prev.filter(p => p.uid !== uid));
  }

  // ── edit handlers ──────────────────────────────────────────────────────────

  function openEdit(delegate: DelegateOut) {
    setEditDelegate(delegate);
    setEditError(null);
    setEditDraft({
      first_name:               delegate.first_name,
      last_name:                delegate.last_name,
      full_name:                delegate.full_name,
      preferred_name:           delegate.preferred_name,
      grade:                    delegate.grade,
      email:                    delegate.email,
      delegate_experience:      delegate.delegate_experience,
      delegate_status:          delegate.delegate_status,
      first_committee:          delegate.first_committee,
      second_committee:         delegate.second_committee,
      third_committee:          delegate.third_committee,
      delegation_id:            delegate.delegation_id,
      code_of_conduct_url:      delegate.code_of_conduct_url,
      payment_policy_ack:       delegate.payment_policy_ack,
      cancellation_policy_ack:  delegate.cancellation_policy_ack,
      heard_about:              delegate.heard_about,
      notes:                    delegate.notes
    });
  }

  function closeEdit() {
    setEditDelegate(null);
    setEditError(null);
  }

  function setField<K extends keyof DelegateUpdate>(key: K, value: DelegateUpdate[K]) {
    setEditDraft(prev => ({ ...prev, [key]: value }));
  }

  async function handleSaveEdit() {
    if (!editDelegate) return;
    setEditError(null);
    try {
      await updateDelegate.mutateAsync({ delegateId: editDelegate.id, data: editDraft });
      closeEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unable to save.");
    }
  }

  // ── delegation edit handlers ───────────────────────────────────────────────

  function openEditDelegation(delegation: DelegationOut) {
    setEditDelegation(delegation);
    setEditDelegationError(null);
    setEditDelegationDraft({
      name:                        delegation.name,
      faculty_advisor_first_name:  delegation.faculty_advisor_first_name,
      faculty_advisor_last_name:   delegation.faculty_advisor_last_name,
      faculty_advisor_email:       delegation.faculty_advisor_email,
      contact_role:                delegation.contact_role,
      school_address:              delegation.school_address,
      delegation_size:             delegation.delegation_size,
      attended_before:             delegation.attended_before,
      payment_process:             delegation.payment_process,
      policy_ack_registration:     delegation.policy_ack_registration,
      policy_ack_payment:          delegation.policy_ack_payment,
      policy_ack_cancellation:     delegation.policy_ack_cancellation,
      policy_ack_conduct:          delegation.policy_ack_conduct,
      policy_ack_photography:      delegation.policy_ack_photography,
      heard_about:                 delegation.heard_about,
      notes:                       delegation.notes,
      head_delegate_id:            delegation.head_delegate_id
    });
  }

  function closeDelegationEdit() {
    setEditDelegation(null);
    setEditDelegationError(null);
  }

  function setDelegationField<K extends keyof DelegationUpdate>(key: K, value: DelegationUpdate[K]) {
    setEditDelegationDraft(prev => ({ ...prev, [key]: value }));
  }

  async function handleSaveDelegation() {
    if (!editDelegation) return;
    setEditDelegationError(null);
    try {
      await updateDelegation.mutateAsync({ id: editDelegation.id, data: editDelegationDraft });
      closeDelegationEdit();
    } catch (err) {
      setEditDelegationError(err instanceof Error ? err.message : "Unable to save.");
    }
  }

  // ── assignment handlers ────────────────────────────────────────────────────

  function openAssignment(delegateId: UUID) {
    setAssignmentDelegateId(delegateId);
    setCommitteeId("");
    setCharacterId("");
    setSubmitMessage(null);
    setSubmitError(null);
    setAssignmentOpen(true);
  }

  function openFlow() {
    setFlowIndex(0);
    setAssignmentDelegateId(needsAssignment[0]?.id ?? null);
    setCommitteeId("");
    setCharacterId("");
    setSubmitMessage(null);
    setSubmitError(null);
    setFlowOpen(true);
  }

  function moveFlow(dir: "next" | "prev") {
    if (!needsAssignment.length) return;
    const next = Math.min(Math.max(flowIndex + (dir === "next" ? 1 : -1), 0), needsAssignment.length - 1);
    setFlowIndex(next);
    setAssignmentDelegateId(needsAssignment[next]?.id ?? null);
    setCommitteeId("");
    setCharacterId("");
    setSubmitMessage(null);
    setSubmitError(null);
  }

  async function handleAssign() {
    if (!assignmentDelegateId || !characterId) return;
    setSubmitMessage(null);
    setSubmitError(null);
    const selectedChar = characters.find(c => c.id === characterId);
    if (!selectedChar) { setSubmitError("Character not found."); return; }
    if (selectedChar.delegate_id != null) { setSubmitError("Character already assigned."); return; }
    const currentChar = characters.find(c => c.delegate_id === assignmentDelegateId);
    const prev      = previousAssignments.current.get(assignmentDelegateId);
    const isRestore = !!prev && characterId === prev.characterId;

    try {
      if (currentChar) {
        await updateAssignment.mutateAsync(characterId);
      } else {
        await assignDelegate.mutateAsync({ delegate_id: assignmentDelegateId, character_id: characterId });
      }

      if (isRestore) {
        // Silently restore the delegate's previous status — no email needed
        try {
          await updateDelegate.mutateAsync({
            delegateId: assignmentDelegateId,
            data: { delegate_status: prev.previousStatus }
          });
        } catch { /* non-critical */ }
        setSubmitMessage(`Previous assignment restored — status set back to "${prev.previousStatus}". No email needed.`);
        previousAssignments.current.delete(assignmentDelegateId);
      } else {
        setSubmitMessage(currentChar ? "Delegate reassigned." : "Delegate assigned.");
        if (prev) previousAssignments.current.delete(assignmentDelegateId);
      }

      setAssignmentOpen(false);
      setCharacterId("");
      if (flowOpen) {
        const nextIndex = Math.min(flowIndex + 1, needsAssignment.length - 1);
        if (nextIndex !== flowIndex) { setFlowIndex(nextIndex); setAssignmentDelegateId(needsAssignment[nextIndex]?.id ?? null); setSubmitMessage(null); setSubmitError(null); return; }
        setFlowOpen(false);
      }
      setAssignmentDelegateId(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to assign.");
    }
  }

  // ── export ─────────────────────────────────────────────────────────────────

  function exportDelegates() {
    const headers = ["id","first_name","last_name","full_name","preferred_name","grade","email","delegate_experience","delegate_status","first_committee","second_committee","third_committee","delegation","code_of_conduct_url","payment_policy_ack","cancellation_policy_ack","heard_about","notes"];
    const rows = delegates.map(d =>
      headers.map(k => {
        if (k === "delegation") {
          const name = d.delegation_id ? delegationMap.get(d.delegation_id)?.name : "";
          return `"${(name ?? "").replaceAll('"', '""')}"`;
        }
        const v = (d as Record<string, unknown>)[k];
        return `"${String(v ?? "").replaceAll('"', '""')}"`;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = "delegates-export.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  const selectedDelegate = assignmentDelegateId ? delegateMap.get(assignmentDelegateId) : null;
  const prevAssignment   = assignmentDelegateId ? (previousAssignments.current.get(assignmentDelegateId) ?? null) : null;
  const isSameCharacter  = !!prevAssignment && !!characterId && characterId === prevAssignment.characterId;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <main className="page-shell max-w-6xl space-y-6">

      {/* Page header */}
      <header className="relative overflow-hidden rounded-3xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface)] p-8 shadow-[var(--ssicsim-shadow)]">
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />
        <p className="section-eyebrow">Admin</p>
        <h1 className="section-title mt-2">Delegates</h1>
        <p className="section-subtitle mt-2">Manage delegate records, assignments, and statuses.</p>
      </header>

      {/* Delegates: filters + table */}
      <section id="delegates-table">
        <Card>
          <CardHeader>
            <CardTitle>Delegates</CardTitle>
            <CardDescription>
              Search, filter, and bulk-manage delegates · {sortedDelegates.length} of {delegates.length} shown
              {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as DelegateStatus | "all")}>
              <TabsList>
                {statusFilters.map(f => (
                  <TabsTrigger key={f.value} value={f.value}>
                    {f.label} ({f.value === "all" ? delegates.length : statusCounts.get(f.value as DelegateStatus) ?? 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Committee</Label>
                <Select value={committeeFilterId} onValueChange={v => setCommitteeFilterId(v as UUID | "all")}>
                  <SelectTrigger><SelectValue placeholder="All committees" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All committees</SelectItem>
                    {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search</Label>
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Name or email" />
              </div>
              <div className="flex items-end justify-end gap-2 flex-wrap">
                <Button variant="secondary" onClick={openFlow}>Assignment flow</Button>
                <Button variant="ghost" onClick={exportDelegates}>Export CSV</Button>
              </div>
            </div>
            <Separator />
            {delegatesQuery.isLoading ? (
              <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading…</p>
            ) : sortedDelegates.length === 0 ? (
              <p className="text-sm text-[var(--ssicsim-text-muted)]">No delegates match these filters.</p>
            ) : (
              <>
                <Table>
                  <DelegateTableHead sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <TableBody>
                    {pagedDelegates.map(d => <DelegateRow key={d.id} {...rowProps(d)} />)}
                  </TableBody>
                </Table>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--ssicsim-text-muted)]">
                    Page {currentPage} of {pageCount} · {sortedDelegates.length} delegate{sortedDelegates.length === 1 ? "" : "s"}
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
      </section>

      {/* Delegations */}
      <section id="delegations">
        <Card>
          <CardHeader>
            <CardTitle>Delegations</CardTitle>
            <CardDescription>Delegation roster and faculty advisors.</CardDescription>
          </CardHeader>
          <CardContent>
            {delegationsQuery.isLoading ? (
              <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading…</p>
            ) : delegations.length === 0 ? (
              <p className="text-sm text-[var(--ssicsim-text-muted)]">No delegations yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delegation</TableHead>
                    <TableHead>Faculty Advisor</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Attended Before</TableHead>
                    <TableHead>Delegates</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delegations.map(delegation => {
                    const count = delegates.filter(d => d.delegation_id === delegation.id).length;
                    const advisor = [delegation.faculty_advisor_first_name, delegation.faculty_advisor_last_name].filter(Boolean).join(" ");
                    return (
                      <TableRow key={delegation.id}>
                        <TableCell className="font-medium">{delegation.name}</TableCell>
                        <TableCell>
                          <div>{advisor || "--"}</div>
                          <div className="text-xs text-[var(--ssicsim-text-muted)]">{delegation.faculty_advisor_email ?? ""}</div>
                        </TableCell>
                        <TableCell>{delegation.contact_role ?? "--"}</TableCell>
                        <TableCell>{delegation.delegation_size ?? "--"}</TableCell>
                        <TableCell>
                          {delegation.attended_before == null ? "--" : delegation.attended_before ? "Yes" : "No"}
                        </TableCell>
                        <TableCell>{count}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => openEditDelegation(delegation)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Delegation Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={editDelegation !== null} onOpenChange={open => { if (!open) closeDelegationEdit(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDelegation?.name}</DialogTitle>
            <DialogDescription>Edit delegation details</DialogDescription>
          </DialogHeader>

          {editDelegation && (
            <div className="space-y-5 pt-1">

              {/* Contact info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Advisor first name</Label>
                  <Input value={editDelegationDraft.faculty_advisor_first_name ?? ""} onChange={e => setDelegationField("faculty_advisor_first_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Advisor last name</Label>
                  <Input value={editDelegationDraft.faculty_advisor_last_name ?? ""} onChange={e => setDelegationField("faculty_advisor_last_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Advisor email</Label>
                  <Input value={editDelegationDraft.faculty_advisor_email ?? ""} onChange={e => setDelegationField("faculty_advisor_email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Contact role</Label>
                  <Input value={editDelegationDraft.contact_role ?? ""} onChange={e => setDelegationField("contact_role", e.target.value)} />
                </div>
              </div>

              <Separator />

              {/* Delegation details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>School address</Label>
                  <Textarea value={editDelegationDraft.school_address ?? ""} onChange={e => setDelegationField("school_address", e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Payment process</Label>
                  <Input value={editDelegationDraft.payment_process ?? ""} onChange={e => setDelegationField("payment_process", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Delegation size</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editDelegationDraft.delegation_size ?? ""}
                    onChange={e => setDelegationField("delegation_size", e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attended before</Label>
                  <Select
                    value={editDelegationDraft.attended_before == null ? "unset" : editDelegationDraft.attended_before ? "yes" : "no"}
                    onValueChange={v => setDelegationField("attended_before", v === "unset" ? null : v === "yes")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Heard about</Label>
                  <Input value={editDelegationDraft.heard_about ?? ""} onChange={e => setDelegationField("heard_about", e.target.value)} />
                </div>
              </div>

              <Separator />

              {/* Policy acknowledgments */}
              <div>
                <p className="text-sm font-semibold text-[var(--ssicsim-brand-navy)] mb-3">Policy Acknowledgments</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    { key: "policy_ack_registration", label: "Registration policy" },
                    { key: "policy_ack_payment",      label: "Payment policy" },
                    { key: "policy_ack_cancellation", label: "Cancellation policy" },
                    { key: "policy_ack_conduct",      label: "Code of conduct" },
                    { key: "policy_ack_photography",  label: "Photography / media release" }
                  ] as { key: keyof DelegationUpdate; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Select
                        value={editDelegationDraft[key] == null ? "unset" : editDelegationDraft[key] ? "yes" : "no"}
                        onValueChange={v => setDelegationField(key, v === "unset" ? null : v === "yes")}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">Not set</SelectItem>
                          <SelectItem value="yes">Acknowledged</SelectItem>
                          <SelectItem value="no">Not acknowledged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={editDelegationDraft.notes ?? ""} onChange={e => setDelegationField("notes", e.target.value)} rows={3} />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button onClick={handleSaveDelegation} disabled={updateDelegation.isPending}>
                  {updateDelegation.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="ghost" onClick={closeDelegationEdit} disabled={updateDelegation.isPending}>
                  Cancel
                </Button>
                {editDelegationError && (
                  <span className="text-xs text-red-600">{editDelegationError}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={editDelegate !== null} onOpenChange={open => { if (!open) closeEdit(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDelegate?.preferred_name ?? editDelegate?.first_name} {editDelegate?.last_name}
            </DialogTitle>
            <DialogDescription>Edit delegate record</DialogDescription>
          </DialogHeader>

          {editDelegate && (
            <div className="space-y-5 pt-1">

              {/* Personal info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={editDraft.first_name ?? ""} onChange={e => setField("first_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={editDraft.last_name ?? ""} onChange={e => setField("last_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Preferred name</Label>
                  <Input value={editDraft.preferred_name ?? ""} onChange={e => setField("preferred_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Input value={editDraft.grade ?? ""} onChange={e => setField("grade", e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Email</Label>
                  <Input value={editDraft.email ?? ""} onChange={e => setField("email", e.target.value)} />
                </div>
              </div>

              <Separator />

              {/* Status & assignment */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editDraft.delegate_status ?? ""} onValueChange={v => setField("delegate_status", v as DelegateStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Awaiting Payment">Awaiting Payment</SelectItem>
                      <SelectItem value="Awaiting Assignment">Awaiting Assignment</SelectItem>
                      <SelectItem value="Assigned">Assigned</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Experience</Label>
                  <Select value={editDraft.delegate_experience ?? ""} onValueChange={v => setField("delegate_experience", v as DelegateUpdate["delegate_experience"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Expertise">Expertise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delegation</Label>
                  <Select value={editDraft.delegation_id ?? "__none__"} onValueChange={v => setField("delegation_id", v === "__none__" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Independent" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Independent Delegate</SelectItem>
                      {delegations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Committee preferences */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>1st preference</Label>
                  <Input value={editDraft.first_committee ?? ""} onChange={e => setField("first_committee", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>2nd preference</Label>
                  <Input value={editDraft.second_committee ?? ""} onChange={e => setField("second_committee", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>3rd preference</Label>
                  <Input value={editDraft.third_committee ?? ""} onChange={e => setField("third_committee", e.target.value)} />
                </div>
              </div>

              <Separator />

              {/* Admin notes */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Heard about</Label>
                  <Input value={editDraft.heard_about ?? ""} onChange={e => setField("heard_about", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Code of conduct URL</Label>
                  <Input value={editDraft.code_of_conduct_url ?? ""} onChange={e => setField("code_of_conduct_url", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Code of conduct signed</Label>
                <Select
                  value={editDraft.code_of_conduct_signed == null ? "unset" : editDraft.code_of_conduct_signed ? "yes" : "no"}
                  onValueChange={v => setField("code_of_conduct_signed", v === "unset" ? null : v === "yes")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    <SelectItem value="yes">Signed</SelectItem>
                    <SelectItem value="no">Not signed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={editDraft.notes ?? ""} onChange={e => setField("notes", e.target.value)} rows={3} />
              </div>

              <Separator />

              {/* Compliance */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment policy</Label>
                  <Select
                    value={editDraft.payment_policy_ack == null ? "unset" : editDraft.payment_policy_ack ? "yes" : "no"}
                    onValueChange={v => setField("payment_policy_ack", v === "unset" ? null : v === "yes")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      <SelectItem value="yes">Acknowledged</SelectItem>
                      <SelectItem value="no">Not acknowledged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cancellation policy</Label>
                  <Select
                    value={editDraft.cancellation_policy_ack == null ? "unset" : editDraft.cancellation_policy_ack ? "yes" : "no"}
                    onValueChange={v => setField("cancellation_policy_ack", v === "unset" ? null : v === "yes")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      <SelectItem value="yes">Acknowledged</SelectItem>
                      <SelectItem value="no">Not acknowledged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button onClick={handleSaveEdit} disabled={updateDelegate.isPending}>
                  {updateDelegate.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="ghost" onClick={closeEdit} disabled={updateDelegate.isPending}>
                  Cancel
                </Button>
                {editError && (
                  <span className="text-xs text-red-600">{editError}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Assignment Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Delegate</DialogTitle>
            <DialogDescription>Pick a committee and character for this delegate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDelegate ? (
              <div className="rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-3 text-sm">
                <p className="font-medium text-[var(--ssicsim-brand-navy)]">
                  {selectedDelegate.last_name}, {selectedDelegate.first_name}
                </p>
                <p className="text-[var(--ssicsim-text-muted)]">
                  Preferences: {[selectedDelegate.first_committee, selectedDelegate.second_committee, selectedDelegate.third_committee].filter(Boolean).join(" / ") || "--"}
                </p>
                <p className="text-[var(--ssicsim-text-muted)]">
                  Delegation: {delegationMap.get(selectedDelegate.delegation_id ?? "")?.name ?? "Independent Delegate"}
                </p>
                {characters.find(c => c.delegate_id === selectedDelegate.id) && (
                  <p className="text-xs text-[var(--ssicsim-text-muted)]">Already assigned — selecting a character will reassign them.</p>
                )}
              </div>
            ) : null}

            {/* Committee open seats */}
            <div className="rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ssicsim-text-muted)] mb-2">
                Committee open seats
              </p>
              <div className="space-y-1.5">
                {committeeStats
                  .sort((a, b) => b.openCount - a.openCount)
                  .map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className={[
                        "truncate",
                        committeeId === s.id
                          ? "font-semibold text-[var(--ssicsim-brand-navy)]"
                          : "text-[var(--ssicsim-text)]"
                      ].join(" ")}>
                        {s.name}
                      </span>
                      <span className={[
                        "shrink-0 tabular-nums",
                        s.openCount === 0
                          ? "text-[var(--ssicsim-text-muted)]"
                          : "text-[var(--ssicsim-brand-navy)] font-medium"
                      ].join(" ")}>
                        {s.openCount} open · {s.occupiedPercent}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Committee</Label>
              <Select value={committeeId} onValueChange={setCommitteeId}>
                <SelectTrigger><SelectValue placeholder="Select committee" /></SelectTrigger>
                <SelectContent>
                  {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Character</Label>
              <Select value={characterId} onValueChange={setCharacterId}>
                <SelectTrigger><SelectValue placeholder="Select character" /></SelectTrigger>
                <SelectContent>
                  {filteredCharacters.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {prevAssignment?.characterId === c.id ? " ↩ previous" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[var(--ssicsim-text-muted)]">Only unassigned characters shown.</p>
            </div>

            {/* Same-character restore banner */}
            {isSameCharacter && prevAssignment && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm">
                <p className="font-semibold text-emerald-800">↩ Restoring previous assignment</p>
                <p className="mt-0.5 text-xs text-emerald-700">
                  Status will be set back to <strong>{prevAssignment.previousStatus}</strong> automatically — no confirmation email needed.
                </p>
              </div>
            )}
            {prevAssignment && characterId && !isSameCharacter && (
              <div className="rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] px-3 py-2 text-xs text-[var(--ssicsim-text-muted)]">
                Previously: <span className="font-medium text-[var(--ssicsim-text)]">{prevAssignment.committeeName} — {prevAssignment.characterName}</span>.
                {" "}This is a new assignment — a confirmation email may be needed.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleAssign} disabled={!assignmentDelegateId || !characterId || assignDelegate.isPending}>
                {assignDelegate.isPending ? "Assigning…" : isSameCharacter ? "Restore assignment" : "Assign delegate"}
              </Button>
              {submitMessage && <Badge variant="success">{submitMessage}</Badge>}
            </div>
            {committeeId && filteredCharacters.length === 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                No remaining characters in this committee.
              </div>
            )}
            {submitError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError}</div>
            )}
            {committees.length === 0 && (
              <Alert><AlertTitle>No committees</AlertTitle><AlertDescription>Create committees before assigning.</AlertDescription></Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Assignment Flow Dialog ────────────────────────────────────────────── */}
      <Dialog open={flowOpen} onOpenChange={setFlowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment Flow</DialogTitle>
            <DialogDescription>Assign delegates one by one in sequence.</DialogDescription>
          </DialogHeader>
          {needsAssignment.length === 0 ? (
            <Alert><AlertTitle>No delegates waiting</AlertTitle><AlertDescription>All delegates have assignments.</AlertDescription></Alert>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-3 text-sm">
                <p className="text-[var(--ssicsim-text-muted)]">Committee open seats</p>
                <div className="mt-2 space-y-1 text-xs">
                  {committeeStats.sort((a, b) => b.openCount - a.openCount).slice(0, 6).map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <span>{s.name}</span>
                      <span className="text-[var(--ssicsim-text-muted)]">{s.openCount} open · {s.occupiedPercent}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedDelegate && (
                <div className="rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-3 text-sm">
                  <p className="font-medium text-[var(--ssicsim-brand-navy)]">{selectedDelegate.last_name}, {selectedDelegate.first_name}</p>
                  <p className="text-[var(--ssicsim-text-muted)]">
                    Preferences: {[selectedDelegate.first_committee, selectedDelegate.second_committee, selectedDelegate.third_committee].filter(Boolean).join(" / ") || "--"}
                  </p>
                  <p className="text-[var(--ssicsim-text-muted)]">
                    Delegation: {delegationMap.get(selectedDelegate.delegation_id ?? "")?.name ?? "Independent Delegate"}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Committee</Label>
                <Select value={committeeId} onValueChange={setCommitteeId}>
                  <SelectTrigger><SelectValue placeholder="Select committee" /></SelectTrigger>
                  <SelectContent>
                    {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Character</Label>
                <Select value={characterId} onValueChange={setCharacterId}>
                  <SelectTrigger><SelectValue placeholder="Select character" /></SelectTrigger>
                  <SelectContent>
                    {filteredCharacters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleAssign} disabled={!assignmentDelegateId || !characterId || assignDelegate.isPending}>
                  {assignDelegate.isPending ? "Assigning…" : "Assign delegate"}
                </Button>
                <Button variant="ghost" onClick={() => moveFlow("prev")} disabled={flowIndex <= 0}>Previous</Button>
                <Button variant="secondary" onClick={() => moveFlow("next")} disabled={flowIndex >= needsAssignment.length - 1}>Next</Button>
                {submitMessage && <Badge variant="success">{submitMessage}</Badge>}
              </div>
              {committeeId && filteredCharacters.length === 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">No remaining characters.</div>
              )}
              {submitError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError}</div>
              )}
              <p className="text-xs text-[var(--ssicsim-text-muted)]">Delegate {flowIndex + 1} of {needsAssignment.length}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────── */}
      <Dialog open={deleteConfirmDelegate !== null} onOpenChange={open => { if (!open) { setDeleteConfirmDelegate(null); setDeleteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete delegate?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong>
                {deleteConfirmDelegate?.preferred_name ?? deleteConfirmDelegate?.first_name}{" "}
                {deleteConfirmDelegate?.last_name}
              </strong>{" "}
              and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-xs text-red-600">{deleteError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => { setDeleteConfirmDelegate(null); setDeleteError(null); }}
              disabled={deleteDelegate.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteDelegate.isPending}
              onClick={async () => {
                if (!deleteConfirmDelegate) return;
                setDeleteError(null);
                try {
                  await deleteDelegate.mutateAsync(deleteConfirmDelegate.id);
                  setDeleteConfirmDelegate(null);
                } catch (err) {
                  setDeleteError(err instanceof Error ? err.message : "Unable to delete.");
                }
              }}
            >
              {deleteDelegate.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Undo toast stack ──────────────────────────────────────────────── */}
      {pendingUnassigns.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {pendingUnassigns.map(p => (
            <UnassignToast key={p.uid} pending={p} onUndo={() => undoUnassign(p.uid)} />
          ))}
        </div>
      )}

    </main>
  );
}
