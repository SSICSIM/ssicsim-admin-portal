"use client";

import { useEffect, useMemo, useState } from "react";

import {
  useAssignDelegate,
  useCharacters,
  useCommittees,
  useDelegates,
  useDelegations
} from "@/hooks/useAdminQueries";
import type { CharacterOut, CommitteeOut, UUID } from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { FlowFooterActions, FlowLayout } from "@/components/flows";
import { cn } from "@/lib/utils";
import {
  buildCharactersByCommittee,
  computeAvailableByExperience,
  computeCommitteeFill,
  formatExperience,
  sortCharactersByPriorityDesc,
  sortCommitteesByPreference
} from "@/utils/committee";

const PREFERENCE_LABELS = ["1st pick", "2nd pick", "3rd pick"];

function CommitteeStatRow({
  committee,
  characters,
  active,
  preferenceRank,
  onSelect
}: {
  committee: CommitteeOut;
  characters: CharacterOut[];
  active: boolean;
  preferenceRank?: number;
  onSelect: () => void;
}) {
  const stats = computeCommitteeFill(characters);
  const available = computeAvailableByExperience(characters);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl px-3 py-2.5 text-left transition-all",
        active ? "bg-brand-gold-soft" : "hover:bg-white/10"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-sm font-semibold", active ? "text-brand-navy" : "text-white")}>
          {committee.name}
        </span>
        <span className={cn("text-xs font-medium", active ? "text-brand-navy" : "text-white/70")}>
          {stats.filled}/{stats.total}
        </span>
      </div>
      {preferenceRank !== undefined && (
        <span
          className={cn(
            "mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wide",
            active ? "text-brand-navy/70" : "text-brand-gold"
          )}
        >
          {PREFERENCE_LABELS[preferenceRank]}
        </span>
      )}
      <div
        className={cn(
          "mt-1.5 flex items-center justify-between text-[11px]",
          active ? "text-brand-navy/80" : "text-white/50"
        )}
      >
        <span>L {stats.lowTotal - stats.lowFilled} left</span>
        <span>M {stats.mediumTotal - stats.mediumFilled} left</span>
        <span>H {stats.highTotal - stats.highFilled} left</span>
        <span className="font-semibold">{stats.total - stats.filled} left</span>
      </div>
      <div
        className={cn(
          "mt-1 flex items-center justify-between text-[11px]",
          active ? "text-brand-navy/70" : "text-white/40"
        )}
      >
        <span>Beg {available.Beginner}</span>
        <span>Int {available.Intermediate}</span>
        <span>Adv {available.Advanced}</span>
      </div>
    </button>
  );
}

export default function AssignmentsPage() {
  const delegatesQuery = useDelegates();
  const charactersQuery = useCharacters();
  const committeesQuery = useCommittees();
  const delegationsQuery = useDelegations();
  const assignDelegate = useAssignDelegate();

  const delegates = useMemo(() => delegatesQuery.data ?? [], [delegatesQuery.data]);
  const characters = useMemo(() => charactersQuery.data ?? [], [charactersQuery.data]);
  const committees = useMemo(() => committeesQuery.data ?? [], [committeesQuery.data]);
  const delegations = useMemo(() => delegationsQuery.data ?? [], [delegationsQuery.data]);
  const delegationMap = useMemo(() => new Map(delegations.map((d) => [d.id, d])), [delegations]);

  // Earliest registrants get assigned first — delegates without a recorded
  // date sort last rather than jumping the queue.
  const needsAssignment = useMemo(
    () =>
      delegates
        .filter((d) => d.delegate_status === "Awaiting Assignment")
        .sort((a, b) => {
          const aTime = a.date_applied ? new Date(a.date_applied).getTime() : Infinity;
          const bTime = b.date_applied ? new Date(b.date_applied).getTime() : Infinity;
          return aTime - bTime;
        }),
    [delegates]
  );

  const charactersByCommittee = useMemo(() => buildCharactersByCommittee(characters), [characters]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [committeeId, setCommitteeId] = useState<UUID | "">("");
  const [characterId, setCharacterId] = useState<UUID | "">("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // The list shrinks as delegates get assigned, so clamp the pointer instead
  // of tracking a separate "done" flag per delegate.
  useEffect(() => {
    setActiveIndex((i) => Math.max(0, Math.min(i, needsAssignment.length - 1)));
  }, [needsAssignment.length]);

  const activeDelegate = needsAssignment[activeIndex] ?? null;

  const preferences = useMemo(
    () => [
      activeDelegate?.first_committee,
      activeDelegate?.second_committee,
      activeDelegate?.third_committee
    ],
    [activeDelegate]
  );

  // Surfaces the active delegate's preferred committees at the top of the
  // scrollable sidebar so the assigner doesn't have to hunt for them.
  const sortedCommittees = useMemo(
    () => sortCommitteesByPreference(committees, preferences),
    [committees, preferences]
  );

  const preferenceRankByCommitteeId = useMemo(() => {
    const map = new Map<UUID, number>();
    const normalizedPrefs = preferences.map((p) => p?.trim().toLowerCase());
    committees.forEach((c) => {
      const rank = normalizedPrefs.indexOf(c.name.trim().toLowerCase());
      if (rank !== -1) map.set(c.id, rank);
    });
    return map;
  }, [committees, preferences]);

  const availableCharacters = useMemo(
    () =>
      sortCharactersByPriorityDesc(
        (charactersByCommittee.get(committeeId) ?? []).filter((c) => !c.delegate_id)
      ),
    [charactersByCommittee, committeeId]
  );

  function resetSelection() {
    setCommitteeId("");
    setCharacterId("");
    setError(null);
    setMessage(null);
  }

  function goTo(index: number) {
    setActiveIndex(Math.max(0, Math.min(index, needsAssignment.length - 1)));
    resetSelection();
  }

  function selectCommittee(id: UUID) {
    setCommitteeId(id);
    setCharacterId("");
  }

  async function handleAssign() {
    if (!activeDelegate || !characterId) return;
    setError(null);
    setMessage(null);
    try {
      await assignDelegate.mutateAsync({
        delegate_id: activeDelegate.id,
        character_id: characterId
      });
      setMessage(`${activeDelegate.first_name} ${activeDelegate.last_name} assigned.`);
      setCommitteeId("");
      setCharacterId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign.");
    }
  }

  const isLoading =
    delegatesQuery.isLoading || charactersQuery.isLoading || committeesQuery.isLoading;

  return (
    <FlowLayout
      sidebarClassName="w-80 overflow-y-auto"
      sidebar={
        <div className="space-y-1">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
            Committee fill
          </p>
          {sortedCommittees.map((c) => (
            <CommitteeStatRow
              key={c.id}
              committee={c}
              characters={charactersByCommittee.get(c.id) ?? []}
              active={c.id === committeeId}
              preferenceRank={preferenceRankByCommitteeId.get(c.id)}
              onSelect={() => selectCommittee(c.id)}
            />
          ))}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-bold text-brand-navy">Assignment Flow</h1>
        <Badge variant={needsAssignment.length === 0 ? "success" : "info"}>
          {needsAssignment.length === 0
            ? "All caught up"
            : `${activeIndex + 1} of ${needsAssignment.length} remaining`}
        </Badge>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-[var(--ssicsim-text-muted)]">Loading…</p>
      ) : !activeDelegate ? (
        <Alert className="mt-6">
          <AlertTitle>No delegates waiting</AlertTitle>
          <AlertDescription>All delegates have assignments.</AlertDescription>
        </Alert>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-4 text-sm">
            <p className="font-medium text-[var(--ssicsim-brand-navy)]">
              {activeDelegate.last_name}, {activeDelegate.first_name}
            </p>
            <p className="text-[var(--ssicsim-text-muted)]">
              Preferences:{" "}
              {[
                activeDelegate.first_committee,
                activeDelegate.second_committee,
                activeDelegate.third_committee
              ]
                .filter(Boolean)
                .join(" / ") || "--"}
            </p>
            <p className="text-[var(--ssicsim-text-muted)]">
              Delegation:{" "}
              {delegationMap.get(activeDelegate.delegation_id ?? "")?.name ??
                "Independent Delegate"}
            </p>
            <p className="text-[var(--ssicsim-text-muted)]">
              Experience: {activeDelegate.delegate_experience}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Character</label>
            {committeeId ? (
              <Select value={characterId} onValueChange={(v) => setCharacterId(v as UUID)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select character" />
                </SelectTrigger>
                <SelectContent>
                  {availableCharacters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} (P{c.priority ?? "–"} · {formatExperience(c.experience)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-[var(--ssicsim-text-muted)]">
                Pick a committee from the left to see its available characters.
              </p>
            )}
            {committeeId && availableCharacters.length === 0 && (
              <p className="text-xs text-red-600">No remaining characters in this committee.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {message && <Badge variant="success">{message}</Badge>}
            {error && <Badge variant="destructive">{error}</Badge>}
          </div>
        </div>
      )}

      <FlowFooterActions
        onBack={() => goTo(activeIndex - 1)}
        backDisabled={activeIndex <= 0}
        primaryLabel={assignDelegate.isPending ? "Assigning…" : "Assign & next"}
        onPrimary={handleAssign}
        primaryDisabled={!activeDelegate || !characterId || assignDelegate.isPending}
      />
    </FlowLayout>
  );
}
