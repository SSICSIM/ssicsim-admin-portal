"use client";

import Link from "next/link";

import { useCommittees } from "@/hooks/useAdminQueries";

export function CommitteesList() {
  const committeesQuery = useCommittees();

  if (committeesQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--ssicsim-border)] bg-white p-5 text-sm text-[var(--ssicsim-text-muted)]">
        Loading committees...
      </div>
    );
  }

  if (committeesQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Failed to load committees.
      </div>
    );
  }

  const committees = committeesQuery.data ?? [];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--ssicsim-border)] bg-white p-5 shadow-[var(--ssicsim-shadow)]">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />
      <p className="section-eyebrow">Directory</p>
      <h2 className="mt-1 text-lg font-bold text-[var(--ssicsim-brand-navy)] [font-family:var(--font-heading)]">
        Committee Directory
      </h2>
      {committees.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--ssicsim-text-muted)]">No committees created yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {committees.map((committee) => (
            <li
              key={committee.id}
              className="group rounded-xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-3 transition-all hover:border-[var(--ssicsim-brand-gold)]/60 hover:bg-[var(--ssicsim-brand-gold-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--ssicsim-brand-navy)]">{committee.name}</p>
                  {committee.small_description ? (
                    <p className="mt-1 text-sm text-[var(--ssicsim-text-muted)] line-clamp-2">
                      {committee.small_description}
                    </p>
                  ) : null}
                </div>
                <Link
                  className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--ssicsim-brand-gold)] opacity-0 transition-opacity group-hover:opacity-100"
                  href={`/committees/${committee.id}/edit`}
                >
                  Edit →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
