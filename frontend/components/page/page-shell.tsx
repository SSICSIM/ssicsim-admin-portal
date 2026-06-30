import * as React from "react";

import { cn } from "@/lib/utils";

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Top-level wrapper for a standard (non-flow) admin page. */
export function PageShell({ children, className }: PageShellProps) {
  return <main className={cn("page-shell space-y-6", className)}>{children}</main>;
}

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  /** Action rendered top-right, e.g. a "Create X" button/dialog trigger. */
  action?: React.ReactNode;
}

/**
 * Gold-topped header card used at the top of every admin page
 * (see app/committees/page.tsx and app/delegates/page.tsx).
 */
export function PageHeader({ eyebrow = "Admin", title, description, action }: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 shadow-ssicsim">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-brand-gold to-brand-gold-bright" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h1 className="section-title mt-2">{title}</h1>
          {description ? <p className="section-subtitle mt-2 max-w-2xl">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </header>
  );
}
