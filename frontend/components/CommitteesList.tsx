"use client";

import Link from "next/link";

import { useCommittees } from "@/hooks/useAdminQueries";

export function CommitteesList() {
  const committeesQuery = useCommittees();

  if (committeesQuery.isLoading) {
    return <div className="rounded-xl bg-white/70 p-4 text-sm text-[var(--ssicsim-text-muted)]">Loading committees...</div>;
  }

  if (committeesQuery.isError) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Failed to load committees.</div>;
  }

  const committees = committeesQuery.data ?? [];

  return (
    <section className="rounded-2xl border border-[var(--ssicsim-border)] bg-white p-5 shadow-[var(--ssicsim-shadow)]">
      <h2 className="text-lg font-bold text-[var(--ssicsim-brand-navy)]">Committee Directory</h2>
      {committees.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--ssicsim-text-muted)]">No committees created yet.</p>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {committees.map((committee) => (
            <li key={committee.id} className="rounded-xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--ssicsim-brand-navy)]">{committee.name}</p>
                  {committee.small_description ? (
                    <p className="mt-1 text-sm text-[var(--ssicsim-text-muted)]">{committee.small_description}</p>
                  ) : null}
                </div>
                <Link className="text-xs font-semibold uppercase tracking-wide" href={`/committees/${committee.id}/edit`}>
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
