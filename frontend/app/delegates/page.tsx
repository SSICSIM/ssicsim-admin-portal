"use client";

import { useMemo, useState } from "react";

import {
  useAssignDelegate,
  useCharacters,
  useCommittees,
  useDeleteAssignment,
  useDelegates,
  useDelegations,
  useUpdateAssignment,
  useUpdateDelegate
} from "@/hooks/useAdminQueries";
import type { DelegateStatus, DelegateUpdate, UUID } from "@/types/api";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const statusFilters: { label: string; value: DelegateStatus | "all" }[] = [
  { label: "All delegates", value: "all" },
  { label: "Awaiting assignment", value: "Awaiting Assignment" },
  { label: "Assigned", value: "Assigned" },
  { label: "Confirmed", value: "Confirmed" }
];

const statusBadge: Record<DelegateStatus, "success" | "warning" | "secondary"> = {
  "Awaiting Assignment": "warning",
  Assigned: "success",
  Confirmed: "secondary"
};

export default function DelegatesPage() {
  // Query hooks
  const committeesQuery = useCommittees();
  const charactersQuery = useCharacters();
  const delegatesQuery = useDelegates();
  const delegationsQuery = useDelegations();
  const assignDelegate = useAssignDelegate();
  const deleteAssignment = useDeleteAssignment();
  const updateDelegate = useUpdateDelegate();
  const [editId, setEditId] = useState<UUID | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DelegateUpdate>>({});
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentDelegateId, setAssignmentDelegateId] = useState<UUID | null>(null);
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowIndex, setFlowIndex] = useState(0);
  const updateAssignment = useUpdateAssignment(assignmentDelegateId ?? "");

  const [statusFilter, setStatusFilter] = useState<DelegateStatus | "all">("all");
  const [committeeFilterId, setCommitteeFilterId] = useState<UUID | "all">("all");
  const [committeeId, setCommitteeId] = useState<UUID | "">("");
  const [characterId, setCharacterId] = useState<UUID | "">("");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [emailerMessage, setEmailerMessage] = useState<string | null>(null);
  const [emailerError, setEmailerError] = useState<string | null>(null);
  const [emailerBusy, setEmailerBusy] = useState(false);


  // useMemo: derived data for rendering and filtering.
  const committees = committeesQuery.data ?? [];
  const characters = charactersQuery.data ?? [];
  const delegates = delegatesQuery.data ?? [];
  const delegations = delegationsQuery.data ?? [];

  const availableCharacters = useMemo(
    () => characters.filter((character) => character.delegate_id == null),
    [characters]
  );

  const committeeMap = useMemo(() => new Map(committees.map((committee) => [committee.id, committee])), [committees]);
  const delegateMap = useMemo(() => new Map(delegates.map((delegate) => [delegate.id, delegate])), [delegates]);
  const delegationMap = useMemo(
    () => new Map(delegations.map((delegation) => [delegation.id, delegation])),
    [delegations]
  );
  const assignedCharacterByDelegateId = useMemo(() => {
    const map = new Map<UUID, typeof characters[number]>();
    characters.forEach((character) => {
      if (character.delegate_id != null) {
        map.set(character.delegate_id, character);
      }
    });
    return map;
  }, [characters]);

  // useMemo: filter delegates by search term and status for table rendering.
  // Primary filtered list drives all downstream groupings to keep counts/messages consistent.
  const filteredDelegates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? delegates.filter((delegate) => {
          const haystack = [
            delegate.first_name,
            delegate.last_name,
            delegate.full_name,
            delegate.preferred_name,
            delegate.email
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(term);
        })
      : delegates;
    const statusFiltered = statusFilter === "all"
      ? filtered
      : filtered.filter((delegate) => delegate.delegate_status === statusFilter);
    if (committeeFilterId === "all") return statusFiltered;
    return statusFiltered.filter((delegate) => {
      const assignedCharacter = assignedCharacterByDelegateId.get(delegate.id);
      return assignedCharacter?.committee_id === committeeFilterId;
    });
  }, [delegates, searchTerm, statusFilter, committeeFilterId, assignedCharacterByDelegateId]);

  const { needsAssignment, assignedDelegates, assignedOnly } = useMemo(() => {
    const order: Record<DelegateStatus, number> = {
      "Awaiting Assignment": 2,
      Assigned: 0,
      Confirmed: 1
    };
    const needs = filteredDelegates.filter(
      (delegate) => delegate.delegate_status === "Awaiting Assignment"
    );
    const assigned = filteredDelegates
      .filter((delegate) => delegate.delegate_status !== "Awaiting Assignment")
      .sort((a, b) => order[a.delegate_status] - order[b.delegate_status]);
    const assignedFiltered = filteredDelegates.filter(
      (delegate) => delegate.delegate_status === "Assigned"
    );
    return { needsAssignment: needs, assignedDelegates: assigned, assignedOnly: assignedFiltered };
  }, [filteredDelegates]);

  // Characters available for assignment, optionally narrowed to a committee.
  const filteredCharacters = useMemo(() => {
    return characters.filter((character) => {
      if (committeeId && character.committee_id !== committeeId) return false;
      return character.delegate_id == null;
    });
  }, [characters, committeeId]);

  const committeeStats = useMemo(() => {
    return committees.map((committee) => {
      const committeeCharacters = characters.filter((character) => character.committee_id === committee.id);
      const assignedCount = committeeCharacters.filter((character) => character.delegate_id != null).length;
      const totalCount = committeeCharacters.length;
      const openCount = totalCount - assignedCount;
      const occupiedPercent = totalCount === 0 ? 0 : Math.round((assignedCount / totalCount) * 100);
      return {
        id: committee.id,
        name: committee.name,
        assignedCount,
        openCount,
        totalCount,
        occupiedPercent
      };
    });
  }, [characters, committees]);

  const assignments = useMemo(() => {
    return characters.filter((character) => character.delegate_id != null);
  }, [characters]);

  // Handlers
  const handleAssign = async () => {
    if (!assignmentDelegateId || !characterId) return;
    setSubmitMessage(null);
    setSubmitError(null);
    if (committeeId && filteredCharacters.length === 0) {
      setSubmitError("Selected committee has no remaining characters.");
      return;
    }
    const selectedCharacter = characters.find((character) => character.id === characterId);
    if (!selectedCharacter) {
      setSubmitError("Character not found.");
      return;
    }
    if (selectedCharacter.delegate_id != null) {
      setSubmitError("Character already assigned.");
      return;
    }
    const currentCharacter = characters.find(
      (character) => character.delegate_id === assignmentDelegateId
    );
    try {
      if (currentCharacter) {
        await updateAssignment.mutateAsync(characterId);
        setSubmitMessage("Delegate reassigned successfully.");
      } else {
        await assignDelegate.mutateAsync({ delegate_id: assignmentDelegateId, character_id: characterId });
        setSubmitMessage("Delegate assigned successfully.");
      }
      setAssignmentOpen(false);
      setCharacterId("");
      if (flowOpen) {
        const nextIndex = Math.min(flowIndex + 1, needsAssignment.length - 1);
        if (nextIndex !== flowIndex) {
          setFlowIndex(nextIndex);
          setAssignmentDelegateId(needsAssignment[nextIndex]?.id ?? null);
          setSubmitMessage(null);
          setSubmitError(null);
          return;
        }
        setFlowOpen(false);
      }
      setAssignmentDelegateId(null);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to assign delegate.");
    }
  };

  const handleMassEmailConfirm = async () => {
    // TODO: Replace bulk status update with a real email flow.
    if (assignedOnly.length === 0) {
      setEmailerError("No assigned delegates to confirm.");
      return;
    }
    setEmailerMessage(null);
    setEmailerError(null);
    setEmailerBusy(true);
    try {
      await Promise.all(
        assignedOnly.map((delegate) =>
          updateDelegate.mutateAsync({
            delegateId: delegate.id,
            data: { delegate_status: "Confirmed" }
          })
        )
      );
      setEmailerMessage(`Confirmed ${assignedOnly.length} delegate(s).`);
    } catch (error) {
      setEmailerError(error instanceof Error ? error.message : "Unable to confirm delegates.");
    } finally {
      setEmailerBusy(false);
    }
  };

  const startEdit = (delegateId: UUID) => {
    const delegate = delegateMap.get(delegateId);
    if (!delegate) return;
    setEditId(delegateId);
    setDrafts((prev) => ({
      ...prev,
      [delegateId]: {
        first_name: delegate.first_name,
        last_name: delegate.last_name,
        full_name: delegate.full_name,
        preferred_name: delegate.preferred_name,
        grade: delegate.grade,
        email: delegate.email,
        delegate_experience: delegate.delegate_experience,
        delegate_status: delegate.delegate_status,
        first_committee: delegate.first_committee,
        second_committee: delegate.second_committee,
        third_committee: delegate.third_committee,
        delegation_id: delegate.delegation_id,
        code_of_conduct_url: delegate.code_of_conduct_url,
        payment_policy_ack: delegate.payment_policy_ack,
        cancellation_policy_ack: delegate.cancellation_policy_ack,
        heard_about: delegate.heard_about,
        notes: delegate.notes
      }
    }));
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const handleSave = async (delegateId: UUID) => {
    const payload = drafts[delegateId];
    if (!payload) return;
    setSubmitMessage(null);
    setSubmitError(null);
    try {
      await updateDelegate.mutateAsync({ delegateId, data: payload });
      setEditId(null);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update delegate.");
    }
  };

  const openAssignment = (delegateId: UUID) => {
    setAssignmentDelegateId(delegateId);
    setCommitteeId("");
    setCharacterId("");
    setSubmitMessage(null);
    setSubmitError(null);
    setAssignmentOpen(true);
  };

  const openFlow = () => {
    const nextIndex = needsAssignment.length ? 0 : -1;
    setFlowIndex(nextIndex);
    setAssignmentDelegateId(needsAssignment[0]?.id ?? null);
    setCommitteeId("");
    setCharacterId("");
    setSubmitMessage(null);
    setSubmitError(null);
    setFlowOpen(true);
  };

  const moveFlow = (direction: "next" | "prev") => {
    if (!needsAssignment.length) return;
    const delta = direction === "next" ? 1 : -1;
    const nextIndex = Math.min(Math.max(flowIndex + delta, 0), needsAssignment.length - 1);
    setFlowIndex(nextIndex);
    setAssignmentDelegateId(needsAssignment[nextIndex]?.id ?? null);
    setCommitteeId("");
    setCharacterId("");
    setSubmitMessage(null);
    setSubmitError(null);
  };

  const selectedDelegate = assignmentDelegateId ? delegateMap.get(assignmentDelegateId) : null;

  const exportDelegates = () => {
    const headers = [
      "id",
      "first_name",
      "last_name",
      "full_name",
      "preferred_name",
      "grade",
      "email",
      "delegate_experience",
      "delegate_status",
      "first_committee",
      "second_committee",
      "third_committee",
      "delegation",
      "code_of_conduct_url",
      "payment_policy_ack",
      "cancellation_policy_ack",
      "heard_about",
      "notes"
    ];

    const rows = delegates.map((delegate) =>
      headers
        .map((key) => {
          if (key === "delegation") {
            const delegationName = delegate.delegation_id
              ? delegationMap.get(delegate.delegation_id)?.name
              : "";
            return `"${(delegationName ?? "").replaceAll("\"", "\"\"")}"`;
          }
          const value = (delegate as Record<string, string | null | boolean | undefined>)[key];
          const safe = value == null ? "" : String(value);
          return `"${safe.replaceAll("\"", "\"\"")}"`;
        })
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "delegates-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };


  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Delegates</CardTitle>
          <CardDescription>Manage delegate records and status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            <a className="underline" href="#needs-assignment">Needs assignment</a>
            <span>·</span>
            <a className="underline" href="#assigned-confirmed">Assigned / Confirmed</a>
            <span>·</span>
            <a className="underline" href="#delegations">Delegations</a>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Status filter</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DelegateStatus | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Committee filter</Label>
              <Select value={committeeFilterId} onValueChange={(value) => setCommitteeFilterId(value as UUID | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="All committees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All committees</SelectItem>
                  {committees.map((committee) => (
                    <SelectItem key={committee.id} value={committee.id}>
                      {committee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search delegates</Label>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name or email"
              />
            </div>
            <div className="md:col-span-1 flex items-end justify-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={handleMassEmailConfirm}
                  disabled={emailerBusy || assignedOnly.length === 0}
                >
                  {emailerBusy ? "Emailing..." : "Emailer"}
                </Button>
                <Button variant="secondary" onClick={openFlow}>
                  Assignment flow
                </Button>
                <Button variant="secondary" onClick={exportDelegates}>
                  Export delegates CSV
                </Button>
              </div>
            </div>
          </div>
          {emailerMessage ? <Badge variant="success">{emailerMessage}</Badge> : null}
          {emailerError ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {emailerError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section id="needs-assignment">
        <Card>
        <CardHeader>
          <CardTitle>Needs Assignment</CardTitle>
          <CardDescription>Delegates awaiting committee assignment.</CardDescription>
        </CardHeader>
        <CardContent>
          {delegatesQuery.isLoading ? (
            <p className="text-sm text-white/60">Loading delegates...</p>
          ) : needsAssignment.length === 0 ? (
            <p className="text-sm text-white/60">No delegates need assignment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delegate</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Delegation</TableHead>
                  <TableHead>Committee</TableHead>
                  <TableHead>Character</TableHead>
                  <TableHead>Preferences</TableHead>
                  <TableHead>Waitlist Info</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needsAssignment.map((delegate) => {
                  const isEditing = editId === delegate.id;
                  const draft = drafts[delegate.id] || {};
                  const assignedCharacter = assignedCharacterByDelegateId.get(delegate.id);
                  const assignedCommittee = assignedCharacter
                    ? committeeMap.get(assignedCharacter.committee_id)?.name
                    : null;
                  return (
                    <TableRow key={delegate.id}>
                      <TableCell>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={draft.first_name ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, first_name: event.target.value }
                                }))
                              }
                              placeholder="First name"
                            />
                            <Input
                              value={draft.last_name ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, last_name: event.target.value }
                                }))
                              }
                              placeholder="Last name"
                            />
                          </div>
                        ) : (
                          `${delegate.last_name}, ${delegate.first_name}`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={draft.preferred_name ?? ""}
                            onChange={(event) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, preferred_name: event.target.value }
                              }))
                            }
                            placeholder="Preferred name"
                          />
                        ) : (
                          delegate.preferred_name ?? "--"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={draft.grade ?? ""}
                            onChange={(event) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, grade: event.target.value }
                              }))
                            }
                            placeholder="Grade"
                          />
                        ) : (
                          delegate.grade ?? "--"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={draft.email ?? ""}
                            onChange={(event) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, email: event.target.value }
                              }))
                            }
                          />
                        ) : (
                          delegate.email
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={draft.delegate_status ?? delegate.delegate_status}
                            onValueChange={(value) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, delegate_status: value as DelegateStatus }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Awaiting Assignment">Awaiting Assignment</SelectItem>
                              <SelectItem value="Assigned">Assigned</SelectItem>
                              <SelectItem value="Confirmed">Confirmed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={statusBadge[delegate.delegate_status]}>
                            {delegate.delegate_status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={draft.delegate_experience ?? delegate.delegate_experience}
                            onValueChange={(value) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, delegate_experience: value as DelegateUpdate["delegate_experience"] }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Expertise">Expertise</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          delegate.delegate_experience
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={draft.delegation_id ?? delegate.delegation_id ?? ""}
                            onValueChange={(value) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, delegation_id: value || null }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select delegation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Independent Delegate</SelectItem>
                              {delegations.map((delegation) => (
                                <SelectItem key={delegation.id} value={delegation.id}>
                                  {delegation.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          delegationMap.get(delegate.delegation_id ?? "")?.name ?? "Independent Delegate"
                        )}
                      </TableCell>
                      <TableCell>{assignedCommittee ?? "--"}</TableCell>
                      <TableCell>{assignedCharacter?.name ?? "--"}</TableCell>
                      <TableCell className="text-xs text-white/70">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={draft.first_committee ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, first_committee: event.target.value }
                                }))
                              }
                              placeholder="First preference"
                            />
                            <Input
                              value={draft.second_committee ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, second_committee: event.target.value }
                                }))
                              }
                              placeholder="Second preference"
                            />
                            <Input
                              value={draft.third_committee ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, third_committee: event.target.value }
                                }))
                              }
                              placeholder="Third preference"
                            />
                          </div>
                        ) : (
                          [delegate.first_committee, delegate.second_committee, delegate.third_committee]
                            .filter(Boolean)
                            .join(" / ") || "--"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-white/70">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={draft.code_of_conduct_url ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, code_of_conduct_url: event.target.value }
                                }))
                              }
                              placeholder="Code of conduct URL"
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Select
                                value={draft.payment_policy_ack == null ? "unset" : draft.payment_policy_ack ? "yes" : "no"}
                                onValueChange={(value) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [delegate.id]: { ...draft, payment_policy_ack: value === "unset" ? null : value === "yes" }
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Payment policy" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unset">Not set</SelectItem>
                                  <SelectItem value="yes">Payment policy: Yes</SelectItem>
                                  <SelectItem value="no">Payment policy: No</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={draft.cancellation_policy_ack == null ? "unset" : draft.cancellation_policy_ack ? "yes" : "no"}
                                onValueChange={(value) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [delegate.id]: { ...draft, cancellation_policy_ack: value === "unset" ? null : value === "yes" }
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Cancellation policy" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unset">Not set</SelectItem>
                                  <SelectItem value="yes">Cancellation policy: Yes</SelectItem>
                                  <SelectItem value="no">Cancellation policy: No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              value={draft.heard_about ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, heard_about: event.target.value }
                                }))
                              }
                              placeholder="Heard about"
                            />
                            <Textarea
                              value={draft.notes ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, notes: event.target.value }
                                }))
                              }
                              placeholder="Notes"
                              rows={3}
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>Code of conduct: {delegate.code_of_conduct_url ?? "--"}</div>
                            <div>
                              Payment policy: {delegate.payment_policy_ack == null ? "--" : delegate.payment_policy_ack ? "Yes" : "No"}
                            </div>
                            <div>
                              Cancellation policy: {delegate.cancellation_policy_ack == null ? "--" : delegate.cancellation_policy_ack ? "Yes" : "No"}
                            </div>
                            <div>Heard about: {delegate.heard_about ?? "--"}</div>
                            <div>Notes: {delegate.notes ?? "--"}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openAssignment(delegate.id)}>
                            {delegate.delegate_status === "Awaiting Assignment" ? "Assign" : "Reassign"}
                          </Button>
                          {delegate.delegate_status !== "Awaiting Assignment" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteAssignment.mutateAsync(delegate.id)}
                              disabled={deleteAssignment.isPending}
                            >
                              Unassign
                            </Button>
                          ) : null}
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => handleSave(delegate.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => startEdit(delegate.id)}>
                              Edit
                            </Button>
                          )}
                        </div>
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

      <section id="assigned-confirmed">
        <Card>
        <CardHeader>
          <CardTitle>Assigned / Confirmed</CardTitle>
          <CardDescription>Delegates with assignments or confirmed status.</CardDescription>
        </CardHeader>
        <CardContent>
          {delegatesQuery.isLoading ? (
            <p className="text-sm text-white/60">Loading delegates...</p>
          ) : assignedDelegates.length === 0 ? (
            <p className="text-sm text-white/60">No delegates assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delegate</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Delegation</TableHead>
                  <TableHead>Committee</TableHead>
                  <TableHead>Character</TableHead>
                  <TableHead>Preferences</TableHead>
                  <TableHead>Waitlist Info</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedDelegates.map((delegate) => {
                  const isEditing = editId === delegate.id;
                  const draft = drafts[delegate.id] || {};
                  const assignedCharacter = assignedCharacterByDelegateId.get(delegate.id);
                  const assignedCommittee = assignedCharacter
                    ? committeeMap.get(assignedCharacter.committee_id)?.name
                    : null;
                  return (
                    <TableRow key={delegate.id}>
                      <TableCell>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={draft.first_name ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, first_name: event.target.value }
                                }))
                              }
                              placeholder="First name"
                            />
                            <Input
                              value={draft.last_name ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, last_name: event.target.value }
                                }))
                              }
                              placeholder="Last name"
                            />
                          </div>
                        ) : (
                          `${delegate.last_name}, ${delegate.first_name}`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={draft.preferred_name ?? ""}
                            onChange={(event) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, preferred_name: event.target.value }
                              }))
                            }
                            placeholder="Preferred name"
                          />
                        ) : (
                          delegate.preferred_name ?? "--"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={draft.grade ?? ""}
                            onChange={(event) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, grade: event.target.value }
                              }))
                            }
                            placeholder="Grade"
                          />
                        ) : (
                          delegate.grade ?? "--"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={draft.email ?? ""}
                            onChange={(event) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, email: event.target.value }
                              }))
                            }
                          />
                        ) : (
                          delegate.email
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={draft.delegate_status ?? delegate.delegate_status}
                            onValueChange={(value) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, delegate_status: value as DelegateStatus }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Awaiting Assignment">Awaiting Assignment</SelectItem>
                              <SelectItem value="Assigned">Assigned</SelectItem>
                              <SelectItem value="Confirmed">Confirmed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={statusBadge[delegate.delegate_status]}>
                            {delegate.delegate_status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={draft.delegate_experience ?? delegate.delegate_experience}
                            onValueChange={(value) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, delegate_experience: value as DelegateUpdate["delegate_experience"] }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Expertise">Expertise</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          delegate.delegate_experience
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={draft.delegation_id ?? delegate.delegation_id ?? ""}
                            onValueChange={(value) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [delegate.id]: { ...draft, delegation_id: value || null }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select delegation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Independent Delegate</SelectItem>
                              {delegations.map((delegation) => (
                                <SelectItem key={delegation.id} value={delegation.id}>
                                  {delegation.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          delegationMap.get(delegate.delegation_id ?? "")?.name ?? "Independent Delegate"
                        )}
                      </TableCell>
                      <TableCell>{assignedCommittee ?? "--"}</TableCell>
                      <TableCell>{assignedCharacter?.name ?? "--"}</TableCell>
                      <TableCell className="text-xs text-white/70">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={draft.first_committee ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, first_committee: event.target.value }
                                }))
                              }
                              placeholder="First preference"
                            />
                            <Input
                              value={draft.second_committee ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, second_committee: event.target.value }
                                }))
                              }
                              placeholder="Second preference"
                            />
                            <Input
                              value={draft.third_committee ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, third_committee: event.target.value }
                                }))
                              }
                              placeholder="Third preference"
                            />
                          </div>
                        ) : (
                          [delegate.first_committee, delegate.second_committee, delegate.third_committee]
                            .filter(Boolean)
                            .join(" / ") || "--"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-white/70">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={draft.code_of_conduct_url ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, code_of_conduct_url: event.target.value }
                                }))
                              }
                              placeholder="Code of conduct URL"
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Select
                                value={draft.payment_policy_ack == null ? "unset" : draft.payment_policy_ack ? "yes" : "no"}
                                onValueChange={(value) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [delegate.id]: { ...draft, payment_policy_ack: value === "unset" ? null : value === "yes" }
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Payment policy" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unset">Not set</SelectItem>
                                  <SelectItem value="yes">Payment policy: Yes</SelectItem>
                                  <SelectItem value="no">Payment policy: No</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={draft.cancellation_policy_ack == null ? "unset" : draft.cancellation_policy_ack ? "yes" : "no"}
                                onValueChange={(value) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [delegate.id]: { ...draft, cancellation_policy_ack: value === "unset" ? null : value === "yes" }
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Cancellation policy" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unset">Not set</SelectItem>
                                  <SelectItem value="yes">Cancellation policy: Yes</SelectItem>
                                  <SelectItem value="no">Cancellation policy: No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              value={draft.heard_about ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, heard_about: event.target.value }
                                }))
                              }
                              placeholder="Heard about"
                            />
                            <Textarea
                              value={draft.notes ?? ""}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [delegate.id]: { ...draft, notes: event.target.value }
                                }))
                              }
                              placeholder="Notes"
                              rows={3}
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>Code of conduct: {delegate.code_of_conduct_url ?? "--"}</div>
                            <div>
                              Payment policy: {delegate.payment_policy_ack == null ? "--" : delegate.payment_policy_ack ? "Yes" : "No"}
                            </div>
                            <div>
                              Cancellation policy: {delegate.cancellation_policy_ack == null ? "--" : delegate.cancellation_policy_ack ? "Yes" : "No"}
                            </div>
                            <div>Heard about: {delegate.heard_about ?? "--"}</div>
                            <div>Notes: {delegate.notes ?? "--"}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openAssignment(delegate.id)}>
                            {delegate.delegate_status === "Awaiting Assignment" ? "Assign" : "Reassign"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteAssignment.mutateAsync(delegate.id)}
                            disabled={deleteAssignment.isPending}
                          >
                            Unassign
                          </Button>
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => handleSave(delegate.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => startEdit(delegate.id)}>
                              Edit
                            </Button>
                          )}
                        </div>
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

      <section id="delegations">
        <Card>
        <CardHeader>
          <CardTitle>Delegations</CardTitle>
          <CardDescription>Delegation roster and faculty advisors.</CardDescription>
        </CardHeader>
        <CardContent>
          {delegationsQuery.isLoading ? (
            <p className="text-sm text-white/60">Loading delegations...</p>
          ) : delegations.length === 0 ? (
            <p className="text-sm text-white/60">No delegations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delegation</TableHead>
                  <TableHead>Faculty Advisor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Head Delegate</TableHead>
                  <TableHead>Delegates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delegations.map((delegation) => {
                  const head = delegation.head_delegate_id
                    ? delegateMap.get(delegation.head_delegate_id)
                    : null;
                  const delegateCount = delegates.filter(
                    (delegate) => delegate.delegation_id === delegation.id
                  ).length;
                  const advisorName = [
                    delegation.faculty_advisor_first_name,
                    delegation.faculty_advisor_last_name
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <TableRow key={delegation.id}>
                      <TableCell>{delegation.name}</TableCell>
                      <TableCell>{advisorName || "--"}</TableCell>
                      <TableCell>{delegation.faculty_advisor_email ?? "--"}</TableCell>
                      <TableCell>{head ? `${head.last_name}, ${head.first_name}` : "--"}</TableCell>
                      <TableCell>{delegateCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        </Card>
      </section>

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Delegate</DialogTitle>
            <DialogDescription>Pick a committee and character for this delegate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDelegate ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <p className="font-medium text-white">
                  {selectedDelegate.last_name}, {selectedDelegate.first_name}
                </p>
                <p className="text-white/70">
                  Preferences: {[selectedDelegate.first_committee, selectedDelegate.second_committee, selectedDelegate.third_committee]
                    .filter(Boolean)
                    .join(" / ") || "--"}
                </p>
                <p className="text-white/60">
                  Delegation: {delegationMap.get(selectedDelegate.delegation_id ?? "")?.name ?? "Independent Delegate"}
                </p>
                {characters.find((character) => character.delegate_id === selectedDelegate.id) ? (
                  <p className="text-xs text-white/50">This delegate already has an assignment. Selecting a character will reassign them.</p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Committee</Label>
              <Select value={committeeId} onValueChange={(value) => setCommitteeId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select committee" />
                </SelectTrigger>
                <SelectContent>
                  {committees.map((committee) => (
                    <SelectItem key={committee.id} value={committee.id}>
                      {committee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Character</Label>
              <Select value={characterId} onValueChange={(value) => setCharacterId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select character" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCharacters.map((character) => (
                    <SelectItem key={character.id} value={character.id}>
                      {character.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-white/50">Only unassigned characters are listed.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleAssign}
                disabled={!assignmentDelegateId || !characterId || assignDelegate.isPending}
              >
                {assignDelegate.isPending ? "Assigning..." : "Assign delegate"}
              </Button>
              {submitMessage ? <Badge variant="success">{submitMessage}</Badge> : null}
            </div>
            {committeeId && filteredCharacters.length === 0 ? (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                Selected committee has no remaining characters.
              </div>
            ) : null}
            {submitError ? (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {submitError}
              </div>
            ) : null}
            {committees.length === 0 ? (
              <Alert>
                <AlertTitle>No committees found</AlertTitle>
                <AlertDescription>Create committees before assigning delegates.</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={flowOpen} onOpenChange={setFlowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment Flow</DialogTitle>
            <DialogDescription>Assign delegates one by one in sequence.</DialogDescription>
          </DialogHeader>
          {needsAssignment.length === 0 ? (
            <Alert>
              <AlertTitle>No delegates waiting</AlertTitle>
              <AlertDescription>All delegates already have assignments.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <p className="text-white/70">Committee open seats</p>
                <div className="mt-2 space-y-1 text-xs">
                  {committeeStats
                    .sort((a, b) => b.openCount - a.openCount)
                    .slice(0, 6)
                    .map((stat) => (
                      <div key={stat.id} className="flex items-center justify-between gap-2">
                        <span>{stat.name}</span>
                          <span className="text-white/60">{stat.openCount} open · {stat.occupiedPercent}%</span>
                      </div>
                    ))}
                </div>
              </div>
              {selectedDelegate ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="font-medium text-white">
                    {selectedDelegate.last_name}, {selectedDelegate.first_name}
                  </p>
                  <p className="text-white/70">
                    Preferences: {[selectedDelegate.first_committee, selectedDelegate.second_committee, selectedDelegate.third_committee]
                      .filter(Boolean)
                      .join(" / ") || "--"}
                  </p>
                  <p className="text-white/60">
                    Delegation: {delegationMap.get(selectedDelegate.delegation_id ?? "")?.name ?? "Independent Delegate"}
                  </p>
                  {characters.find((character) => character.delegate_id === selectedDelegate.id) ? (
                    <p className="text-xs text-white/50">This delegate already has an assignment. Selecting a character will reassign them.</p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Committee</Label>
                <Select value={committeeId} onValueChange={(value) => setCommitteeId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select committee" />
                  </SelectTrigger>
                  <SelectContent>
                    {committees.map((committee) => (
                      <SelectItem key={committee.id} value={committee.id}>
                        {committee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Character</Label>
                <Select value={characterId} onValueChange={(value) => setCharacterId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select character" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCharacters.map((character) => (
                      <SelectItem key={character.id} value={character.id}>
                        {character.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/50">Only unassigned characters are listed.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleAssign}
                  disabled={!assignmentDelegateId || !characterId || assignDelegate.isPending}
                >
                  {assignDelegate.isPending ? "Assigning..." : "Assign delegate"}
                </Button>
                <Button variant="ghost" onClick={() => moveFlow("prev")} disabled={flowIndex <= 0}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => moveFlow("next")}
                  disabled={flowIndex >= needsAssignment.length - 1}
                >
                  Next
                </Button>
                {submitMessage ? <Badge variant="success">{submitMessage}</Badge> : null}
              </div>
              {committeeId && filteredCharacters.length === 0 ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  Selected committee has no remaining characters.
                </div>
              ) : null}
              {submitError ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {submitError}
                </div>
              ) : null}
              <p className="text-xs text-white/50">
                Delegate {flowIndex + 1} of {needsAssignment.length}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
