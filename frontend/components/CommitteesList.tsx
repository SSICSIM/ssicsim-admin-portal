"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CommitteeOut } from "@/types/api";

export function CommitteesList() {
  const committeesQuery = useQuery({
    queryKey: ["committees"],
    queryFn: async () => apiClient.get<CommitteeOut[]>("/api/committees")
  });

  if (committeesQuery.isLoading) return <div className="text-sm text-white/70">Loading committees...</div>;
  if (committeesQuery.isError) return <div className="text-sm text-red-300">Failed to load committees.</div>;

  const committees = committeesQuery.data ?? [];

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h2 className="text-sm font-medium text-white/80">Committees</h2>
      {committees.length === 0 ? (
        <p className="mt-2 text-sm text-white/60">No committees yet. POST one to `/api/committees`.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {committees.map((c) => (
            <li key={c.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

