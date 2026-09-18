import type { CharacterOut } from "@/types/api";
import { CommitteeFillChart } from "@/components/CommitteeFillChart";
import { computeCommitteeFill, splitJccGroups } from "@/utils/committee";

// Renders a committee's fill chart. For a Joint Crisis Committee — every
// character's name tagged "(<side>)", e.g. "Mark (Committee 1)" — this
// renders one chart per side instead of blending both sides' ratios into
// one ring.
export function CommitteeFillCharts({ characters }: { characters: CharacterOut[] }) {
  const jccGroups = splitJccGroups(characters);

  if (!jccGroups) {
    return <CommitteeFillChart stats={computeCommitteeFill(characters)} />;
  }

  // Stacked rather than side-by-side: each chart's legend needs more width
  // than a two-column layout leaves it in a narrow card or sidebar panel.
  return (
    <div className="space-y-4">
      {jccGroups.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ssicsim-text-muted)]">
            {group.label}
          </p>
          <CommitteeFillChart stats={computeCommitteeFill(group.characters)} />
        </div>
      ))}
    </div>
  );
}
