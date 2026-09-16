import type { CommitteeFillStats } from "@/utils/committee";

const TIERS: {
  key: "high" | "medium" | "low";
  totalKey: "highTotal" | "mediumTotal" | "lowTotal";
  label: string;
  color: string;
  radius: number;
}[] = [
  { key: "high", totalKey: "highTotal", label: "High", color: "#e11d48", radius: 44 },
  { key: "medium", totalKey: "mediumTotal", label: "Medium", color: "#d3af37", radius: 33 },
  { key: "low", totalKey: "lowTotal", label: "Low", color: "#0ea5e9", radius: 24 }
];

const STROKE_WIDTH = 6;

// A tier with no characters gets a plain, dim background track instead of a
// solid colored ring — otherwise an unset priority matrix renders every ring
// at a confident 100%, indistinguishable from a genuinely fully-staffed tier.
function Ring({
  radius,
  percent,
  color,
  hasData
}: {
  radius: number;
  percent: number;
  color: string;
  hasData: boolean;
}) {
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;
  return (
    <>
      <circle
        cx={50}
        cy={50}
        r={radius}
        fill="none"
        stroke="var(--ssicsim-border)"
        strokeWidth={STROKE_WIDTH}
      />
      {hasData && (
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform="rotate(-90 50 50)"
        />
      )}
    </>
  );
}

export function CommitteeFillChart({ stats }: { stats: CommitteeFillStats }) {
  const hasCharacters = stats.total > 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={116} height={116} viewBox="0 0 100 100" className="shrink-0">
        {TIERS.map((tier) => (
          <Ring
            key={tier.key}
            radius={tier.radius}
            percent={stats[`${tier.key}Percent`]}
            color={tier.color}
            hasData={stats[tier.totalKey] > 0}
          />
        ))}
        <text
          x={50}
          y={54}
          textAnchor="middle"
          className={
            hasCharacters ? "fill-[var(--ssicsim-brand-navy)]" : "fill-[var(--ssicsim-text-muted)]"
          }
          style={{ fontSize: 15, fontWeight: 700 }}
        >
          {hasCharacters ? `${stats.totalPercent}%` : "--"}
        </text>
      </svg>
      <div className="space-y-1 text-xs">
        {TIERS.map((tier) => {
          const tierHasData = stats[tier.totalKey] > 0;
          return (
            <div key={tier.key} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: tierHasData ? tier.color : "var(--ssicsim-border)" }}
              />
              <span className="text-[var(--ssicsim-text-muted)]">
                {tier.label} {tierHasData ? `${stats[`${tier.key}Percent`]}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
