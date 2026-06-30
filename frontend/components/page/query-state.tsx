import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";

export interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
  children: React.ReactNode;
}

/**
 * Renders loading/error/empty cards for a list-style page, falling through to
 * children once data is loaded. Saves re-writing the same three branches
 * (see app/committees/page.tsx) on every page that lists records.
 */
export function QueryState({
  isLoading,
  isError,
  isEmpty,
  loadingLabel = "Loading...",
  errorLabel = "Failed to load data.",
  emptyLabel = "Nothing to show yet.",
  children
}: QueryStateProps) {
  if (isLoading) return <StateCard text={loadingLabel} />;
  if (isError) return <StateCard text={errorLabel} className="text-red-700" />;
  if (isEmpty) return <StateCard text={emptyLabel} />;
  return <>{children}</>;
}

function StateCard({ text, className = "text-ink-muted" }: { text: string; className?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className={`text-sm ${className}`}>{text}</p>
      </CardContent>
    </Card>
  );
}
