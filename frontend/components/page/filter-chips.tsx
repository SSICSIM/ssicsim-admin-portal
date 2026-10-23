import { cn } from "@/lib/utils";

export interface FilterChipsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Row of pill toggles for filtering a list (see app/events/check-in/page.tsx). */
export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            value === option.value
              ? "border-[var(--ssicsim-brand-navy)] bg-[var(--ssicsim-brand-navy)] text-white"
              : "border-[var(--ssicsim-border)] bg-white text-[var(--ssicsim-text-muted)] hover:border-[var(--ssicsim-brand-navy)]"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
