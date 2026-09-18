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

  // Each side's chart keeps its natural (single-chart) size rather than
  // being stretched into equal-width columns — a fixed-width grid squeezed
  // the legend text into wrapping. flex-wrap lets sides sit side by side
  // when there's room and drop to their own line when there isn't.
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-4">
      {jccGroups.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--ssicsim-text-muted)]">
            {group.label}
          </p>
          <CommitteeFillChart stats={computeCommitteeFill(group.characters)} />
        </div>
      ))}
    </div>
  );
}
