import type { CharacterExperience, CharacterOut, DelegateOut, UUID } from "@/types/api";

export function filterCharactersByCommittee(
  characters: CharacterOut[],
  committeeId: string | undefined
): CharacterOut[] {
  if (!committeeId) return [];
  return characters.filter((character) => character.committee_id === committeeId);
}

export function buildDelegateMap(delegates: DelegateOut[]): Map<string, DelegateOut> {
  return new Map(delegates.map((delegate) => [delegate.id, delegate]));
}

export function buildCharactersByCommittee(characters: CharacterOut[]): Map<UUID, CharacterOut[]> {
  const map = new Map<UUID, CharacterOut[]>();
  characters.forEach((c) => {
    map.set(c.committee_id, [...(map.get(c.committee_id) ?? []), c]);
  });
  return map;
}

export type CommitteeFillStats = {
  lowFilled: number;
  lowTotal: number;
  mediumFilled: number;
  mediumTotal: number;
  highFilled: number;
  highTotal: number;
  lowPercent: number;
  mediumPercent: number;
  highPercent: number;
  totalPercent: number;
  filled: number;
  total: number;
};

export type PriorityTier = "low" | "medium" | "high";

export function priorityTier(priority: number | null): PriorityTier | null {
  if (priority == null) return null;
  if (priority <= 2) return "low";
  if (priority === 3) return "medium";
  return "high";
}

// Priority buckets: Low = 1-2, Medium = 3, High = 4-5. Characters without a
// priority set still count toward the overall total/filled numbers.
export function computeCommitteeFill(characters: CharacterOut[]): CommitteeFillStats {
  let lowFilled = 0;
  let lowTotal = 0;
  let mediumFilled = 0;
  let mediumTotal = 0;
  let highFilled = 0;
  let highTotal = 0;

  characters.forEach((c) => {
    const tier = priorityTier(c.priority);
    const isFilled = c.delegate_id != null;
    if (tier === "low") {
      lowTotal += 1;
      if (isFilled) lowFilled += 1;
    } else if (tier === "medium") {
      mediumTotal += 1;
      if (isFilled) mediumFilled += 1;
    } else if (tier === "high") {
      highTotal += 1;
      if (isFilled) highFilled += 1;
    }
  });

  const filled = characters.filter((c) => c.delegate_id != null).length;
  const total = characters.length;
  // A tier with no characters in it has nothing left to fill — treat that as
  // fully done (100%) rather than 0%, so an empty/unset matrix doesn't read
  // as "totally unfilled".
  const pct = (f: number, t: number) => (t ? Math.round((f / t) * 100) : 100);

  return {
    lowFilled,
    lowTotal,
    mediumFilled,
    mediumTotal,
    highFilled,
    highTotal,
    lowPercent: pct(lowFilled, lowTotal),
    mediumPercent: pct(mediumFilled, mediumTotal),
    highPercent: pct(highFilled, highTotal),
    totalPercent: pct(filled, total),
    filled,
    total
  };
}

export type TierRemaining = { count: number; percent: number };

export type CommitteeRemaining = {
  low: TierRemaining;
  medium: TierRemaining;
  high: TierRemaining;
  total: TierRemaining;
};

function remainingOf(filled: number, total: number): TierRemaining {
  const count = total - filled;
  return { count, percent: total > 0 ? Math.round((count / total) * 100) : 0 };
}

// Unfilled count + percent per tier (and overall) — the percent is share of
// that tier's own seats still open, not share of the committee, so a tiny
// 1-seat tier isn't drowned out by a large one.
export function computeCommitteeRemaining(stats: CommitteeFillStats): CommitteeRemaining {
  return {
    low: remainingOf(stats.lowFilled, stats.lowTotal),
    medium: remainingOf(stats.mediumFilled, stats.mediumTotal),
    high: remainingOf(stats.highFilled, stats.highTotal),
    total: remainingOf(stats.filled, stats.total)
  };
}

export type JccGroup = { label: string; characters: CharacterOut[] };

// A character name ending in "(<side>)", e.g. "Mark (Committee 1)".
const JCC_SIDE_PATTERN = /^.*\S\s+\(([^()]+)\)\s*$/;

// A Joint Crisis Committee runs as two (or more) linked sides sharing one
// committee record — every character's name carries a "(<side>)" suffix
// saying which side they belong to. When every character in the committee
// follows that pattern and it resolves to more than one distinct side,
// group them so each side's fill can be charted separately instead of
// blending both sides into one ratio. Anything else (a regular committee,
// or a JCC-looking name used inconsistently) returns null so callers fall
// back to a single combined chart.
export function splitJccGroups(characters: CharacterOut[]): JccGroup[] | null {
  if (characters.length === 0) return null;
  const groups = new Map<string, CharacterOut[]>();
  for (const character of characters) {
    const match = character.name.match(JCC_SIDE_PATTERN);
    if (!match) return null;
    const label = match[1].trim();
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(character);
  }
  if (groups.size < 2) return null;
  return Array.from(groups, ([label, groupCharacters]) => ({ label, characters: groupCharacters }));
}

// Compact display for a character's experience list, e.g. "Beginner/Advanced"
// or "–" when none is set — used anywhere a character is shown in brackets.
export function formatExperience(experience: CharacterExperience[]): string {
  return experience.length > 0 ? experience.join("/") : "–";
}

export type AvailableByExperience = Record<CharacterExperience, number>;

// Counts of currently-unassigned characters per experience level — used to
// show an assigner at a glance whether a committee still has, say, a
// Beginner-suitable character open before they pick it for a delegate.
export function computeAvailableByExperience(characters: CharacterOut[]): AvailableByExperience {
  const counts: AvailableByExperience = { Beginner: 0, Intermediate: 0, Advanced: 0 };
  characters.forEach((c) => {
    if (c.delegate_id == null) {
      // A character suiting multiple levels counts toward each of them.
      c.experience.forEach((level) => {
        counts[level] += 1;
      });
    }
  });
  return counts;
}

// Highest priority first (P5 → P1), characters with no priority set last.
export function sortCharactersByPriorityDesc<T extends { priority: number | null }>(
  characters: T[]
): T[] {
  return [...characters].sort((a, b) => (b.priority ?? -1) - (a.priority ?? -1));
}

// Higher urgency (more still open) sorts first: mainly by percent of that
// tier's own seats unfilled — so a committee with 1 of 1 high-priority seats
// open ranks as urgent as one with 10 of 10, rather than being drowned out
// by the larger committee — and ties broken by raw remaining count, so
// "50% open" on a 10-seat tier still outranks "50% open" on a 2-seat one.
function compareTierUrgency(a: TierRemaining, b: TierRemaining): number {
  if (b.percent !== a.percent) return b.percent - a.percent;
  return b.count - a.count;
}

// Ranks a delegate's free-text committee preferences (first/second/third)
// to the top of the list, in preference order. The remainder (committees
// that aren't one of the delegate's picks) is ordered by how urgently open
// their high-priority seats are, then medium, then low — so the assigner
// sees the most urgent committees first.
// Matching is case-insensitive/trimmed since preferences are free text, not
// committee IDs.
export function sortCommitteesByPreference<T extends { id: string; name: string }>(
  committees: T[],
  preferences: (string | null | undefined)[],
  remainingByCommitteeId?: Map<string, CommitteeRemaining>
): T[] {
  const normalizedPrefs = preferences
    .map((p) => p?.trim().toLowerCase())
    .filter((p): p is string => Boolean(p));

  const rank = (committee: T) => {
    const index = normalizedPrefs.indexOf(committee.name.trim().toLowerCase());
    return index === -1 ? normalizedPrefs.length : index;
  };

  return [...committees].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;

    const remainingA = remainingByCommitteeId?.get(a.id);
    const remainingB = remainingByCommitteeId?.get(b.id);
    if (!remainingA || !remainingB) return 0;
    const highDiff = compareTierUrgency(remainingA.high, remainingB.high);
    if (highDiff !== 0) return highDiff;
    const mediumDiff = compareTierUrgency(remainingA.medium, remainingB.medium);
    if (mediumDiff !== 0) return mediumDiff;
    return compareTierUrgency(remainingA.low, remainingB.low);
  });
}
