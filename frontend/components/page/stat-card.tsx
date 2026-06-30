import * as React from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
}

/** Single metric card for a page's stats row (see app/committees/page.tsx). */
export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export interface StatRowProps {
  stats: StatCardProps[];
}

/** Responsive row of StatCards, 1/2/3 columns depending on count. */
export function StatRow({ stats }: StatRowProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  );
}
