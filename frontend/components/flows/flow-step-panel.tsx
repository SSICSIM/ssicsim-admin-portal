import * as React from "react";

import { cn } from "@/lib/utils";

export interface FlowStepPanelProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps one step's body so step content can be declared inline in a flow
 * without each flow re-implementing its own show/hide logic.
 */
export function FlowStepPanel({ active, children, className }: FlowStepPanelProps) {
  if (!active) return null;
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
