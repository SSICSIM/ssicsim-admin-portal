import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { CharacterExperience } from "@/types/api";
import { formatExperience, priorityTier } from "@/utils/committee";

const PRIORITY_BADGE_VARIANT: Record<"high" | "medium" | "low" | "none", BadgeProps["variant"]> = {
  high: "destructive",
  medium: "warning",
  low: "info",
  none: "default"
};

// Shared "Name [priority badge] [experience badge]" label used everywhere a
// character is offered as a pick — replaces the old "(P3 · Beginner)"
// parenthetical so priority reads at a glance instead of as inline text.
export function CharacterOptionLabel({
  character
}: {
  character: { name: string; priority: number | null; experience: CharacterExperience[] };
}) {
  const tier = priorityTier(character.priority) ?? "none";
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate">{character.name}</span>
      <Badge variant={PRIORITY_BADGE_VARIANT[tier]} className="shrink-0">
        {character.priority == null ? "P–" : `P${character.priority}`}
      </Badge>
      <Badge variant="secondary" className="shrink-0">
        {formatExperience(character.experience)}
      </Badge>
    </span>
  );
}
