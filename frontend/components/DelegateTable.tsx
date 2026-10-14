import { ChevronDown, ChevronUp } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import type { DelegateOut, DelegateStatus } from "@/types/api";

// Shared by the Delegates page and the Events registrations table so both
// show a delegate the same way.

export const delegateStatusBadge: Record<
  DelegateStatus,
  "success" | "warning" | "secondary" | "destructive" | "info" | "default"
> = {
  Waitlist: "secondary",
  "Awaiting Payment": "destructive",
  "Verify Payment": "default",
  "Awaiting Assignment": "info",
  Assigned: "warning",
  Confirmed: "success"
};

export function delegateDisplayName(d: DelegateOut): string {
  return `${d.last_name}, ${d.first_name}`;
}

export function SortableHead<K extends string>({
  label,
  sortKeyName,
  activeKey,
  activeDir,
  onSort
}: {
  label: string;
  sortKeyName: K;
  activeKey: K;
  activeDir: "asc" | "desc";
  onSort: (key: K) => void;
}) {
  const isActive = activeKey === sortKeyName;
  return (
    <TableHead className="cursor-pointer select-none" onClick={() => onSort(sortKeyName)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          activeDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : null}
      </span>
    </TableHead>
  );
}
