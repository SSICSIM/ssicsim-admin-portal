import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FlowLayoutProps {
  /** Rendered inside the dark sidebar rail — typically a <FlowStepper />. */
  sidebar: React.ReactNode;
  children: React.ReactNode;
  sidebarClassName?: string;
  className?: string;
}

/**
 * Page-level shell for a multi-step flow: dark sidebar rail + white content pane.
 * Mirrors the layout already used by the email send flow so every wizard-style
 * flow in the admin portal looks and feels the same.
 */
export function FlowLayout({ sidebar, children, sidebarClassName, className }: FlowLayoutProps) {
  return (
    <div className={cn("flex min-h-[calc(100vh-57px)]", className)}>
      <aside className={cn("w-56 shrink-0 bg-brand-navy", sidebarClassName)}>
        <div className="flex flex-col gap-1 p-4 pt-8">{sidebar}</div>
      </aside>
      <div className="flex flex-1 flex-col bg-white">
        <div className="flex flex-1 flex-col p-10 max-w-3xl">{children}</div>
      </div>
    </div>
  );
}

export interface FlowHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  stepLabel: string;
}

/** Title + "Step N: Label" subhead shown at the top of a flow's content pane. */
export function FlowHeader({ step, title, stepLabel }: FlowHeaderProps) {
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-brand-navy">{title}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        <span className="font-semibold text-brand-navy underline">Step {step}</span>: {stepLabel}
      </p>
    </div>
  );
}

export interface FlowFooterActionsProps {
  onBack: () => void;
  backDisabled?: boolean;
  primaryLabel: React.ReactNode;
  onPrimary: () => void;
  primaryDisabled?: boolean;
}

/** Back / primary action footer pinned to the bottom of a flow step. */
export function FlowFooterActions({
  onBack,
  backDisabled,
  primaryLabel,
  onPrimary,
  primaryDisabled
}: FlowFooterActionsProps) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
      <Button variant="ghost" onClick={onBack} disabled={backDisabled}>
        Back
      </Button>
      <Button onClick={onPrimary} disabled={primaryDisabled}>
        {primaryLabel}
      </Button>
    </div>
  );
}
