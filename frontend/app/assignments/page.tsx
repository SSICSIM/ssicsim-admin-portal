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
import { CharacterOptionLabel } from "@/components/CharacterOptionLabel";
import { FlowFooterActions, FlowLayout } from "@/components/flows";
import { cn } from "@/lib/utils";
import {
  buildCharactersByCommittee,
  computeAvailableByExperience,
  computeCommitteeFill,
  computeCommitteeRemaining,
  sortCharactersByPriorityDesc,
  sortCommitteesByPreference,
  splitJccGroups,
  type CommitteeFillStats,
  type CommitteeRemaining
} from "@/utils/committee";

const PREFERENCE_LABELS = ["1st pick", "2nd pick", "3rd pick"];

// Shows how many of each tier are still open (count) alongside how much of
// that tier is already staffed (percent assigned) — e.g. "L 1 (67%)" means
// 1 low-priority seat left, on a tier that's otherwise 67% filled.
function TierRemainingLine({
  stats,
  remaining,
  active
}: {
  stats: CommitteeFillStats;
  remaining: CommitteeRemaining;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-1.5 flex items-center justify-between text-[11px]",
        active ? "text-brand-navy/80" : "text-white/50"
      )}
    >
      <span>
        L {remaining.low.count} ({stats.lowPercent}%)
      </span>
      <span>
        M {remaining.medium.count} ({stats.mediumPercent}%)
      </span>
      <span>
        H {remaining.high.count} ({stats.highPercent}%)
      </span>
      <span className="font-semibold">{remaining.total.count} left</span>
    </div>
  );
}

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
  const remaining = computeCommitteeRemaining(stats);
  const available = computeAvailableByExperience(characters);
  // A Joint Crisis Committee's two sides are blended into one committee
  // record — split them so each side's own fill shows up separately instead
  // of averaging away which side is actually short on characters.
  const jccGroups = splitJccGroups(characters);

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
        <span
          className={cn(
            "min-w-0 truncate text-sm font-semibold",
            active ? "text-brand-navy" : "text-white"
          )}
        >
          {committee.name}
        </span>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap text-xs font-medium",
            active ? "text-brand-navy" : "text-white/70"
          )}
        >
          {stats.filled}/{stats.total} ({stats.totalPercent}%)
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

      {jccGroups ? (
        jccGroups.map((group) => {
          const groupStats = computeCommitteeFill(group.characters);
          return (
            <div key={group.label} className="mt-1.5">
              <p
                className={cn(
                  "flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide",
                  active ? "text-brand-navy/70" : "text-white/60"
                )}
              >
                <span className="min-w-0 truncate">{group.label}</span>
                <span className="shrink-0 whitespace-nowrap">
                  {groupStats.filled}/{groupStats.total} ({groupStats.totalPercent}%)
                </span>
              </p>
              <TierRemainingLine
                stats={groupStats}
                remaining={computeCommitteeRemaining(groupStats)}
                active={active}
              />
            </div>
          );
        })
      ) : (
        <TierRemainingLine stats={stats} remaining={remaining} active={active} />
      )}

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

  // How urgently open each committee's high/medium/low priority seats are
  // — used to order the non-preferred committees by urgency.
  const remainingByCommitteeId = useMemo(() => {
    const map = new Map<UUID, CommitteeRemaining>();
    committees.forEach((c) => {
      map.set(
        c.id,
        computeCommitteeRemaining(computeCommitteeFill(charactersByCommittee.get(c.id) ?? []))
      );
    });
    return map;
  }, [committees, charactersByCommittee]);

  // Surfaces the active delegate's preferred committees at the top of the
  // scrollable sidebar so the assigner doesn't have to hunt for them. The
  // remainder is ordered by percent of high (then medium, then low) priority
  // seats still unfilled, most urgent first.
  const sortedCommittees = useMemo(
    () => sortCommitteesByPreference(committees, preferences, remainingByCommitteeId),
    [committees, preferences, remainingByCommitteeId]
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

  // Moves to the next delegate without assigning the current one — it stays
  // "Awaiting Assignment" and is still reachable with Back.
  function handleSkip() {
    goTo(activeIndex + 1);
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
                      <CharacterOptionLabel character={c} />
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
        secondaryLabel="Skip"
        onSecondary={handleSkip}
        secondaryDisabled={
          !activeDelegate || activeIndex >= needsAssignment.length - 1 || assignDelegate.isPending
        }
        primaryLabel={assignDelegate.isPending ? "Assigning…" : "Assign & next"}
        onPrimary={handleAssign}
        primaryDisabled={!activeDelegate || !characterId || assignDelegate.isPending}
      />
    </FlowLayout>
  );
}
