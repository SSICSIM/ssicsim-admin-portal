"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface FlowStepDefinition {
  number: number;
  label: string;
}

export interface FlowStepperProps {
  steps: FlowStepDefinition[];
  activeStep: number;
  /** Allow jumping back to a completed step by clicking it. Defaults to true. */
  allowBackNavigation?: boolean;
  onStepSelect?: (step: number) => void;
  className?: string;
}

/**
 * Vertical step rail for a multi-step flow (sidebar of a wizard).
 * Visual language extracted from the email send flow — reuse this instead of
 * re-implementing the active/complete/upcoming states per flow.
 */
export function FlowStepper({
  steps,
  activeStep,
  allowBackNavigation = true,
  onStepSelect,
  className
}: FlowStepperProps) {
  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {steps.map((s) => {
        const isActive = activeStep === s.number;
        const isComplete = activeStep > s.number;
        const isClickable = allowBackNavigation && isComplete && Boolean(onStepSelect);

        return (
          <button
            key={s.number}
            type="button"
            onClick={() => isClickable && onStepSelect?.(s.number)}
            disabled={!isClickable}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all",
              isActive
                ? "bg-brand-gold-soft text-brand-navy"
                : isComplete
                ? "cursor-pointer text-white/70 hover:bg-white/10"
                : "cursor-default text-white/35"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                isActive
                  ? "border-brand-gold bg-brand-gold text-white"
                  : isComplete
                  ? "border-white/50 text-white/60"
                  : "border-white/20 text-white/25"
              )}
            >
              {s.number}
            </span>
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
