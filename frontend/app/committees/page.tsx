"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCharacters, useCommittees, useCreateCommittee } from "@/hooks/useAdminQueries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CommitteesPage() {
  const [filter, setFilter] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const committeesQuery = useCommittees();
  const charactersQuery = useCharacters();
  const createCommittee = useCreateCommittee();
  const [formState, setFormState] = useState({
    name: "",
    small_description: "",
    large_description: "",
    director_name: "",
    chair_name: ""
  });
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const characterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (charactersQuery.data ?? []).forEach((character) => {
      counts.set(character.committee_id, (counts.get(character.committee_id) ?? 0) + 1);
    });
    return counts;
  }, [charactersQuery.data]);

  const allCommittees = committeesQuery.data ?? [];
  const committees = allCommittees.filter((committee) =>
    committee.name.toLowerCase().includes(filter.toLowerCase())
  );

  const stats = useMemo(() => {
    const missingCharacters = allCommittees.filter((committee) => (characterCounts.get(committee.id) ?? 0) === 0).length;
    return {
      totalCommittees: allCommittees.length,
      totalCharacters: (charactersQuery.data ?? []).length,
      missingCharacters
    };
  }, [allCommittees, characterCounts, charactersQuery.data]);

  const handleCreateCommittee = async () => {
    setCreateMessage(null);
    setCreateError(null);
    if (!formState.name || !formState.small_description || !formState.large_description || !formState.director_name) {
      setCreateError("Name, short description, full description, and director are required.");
      return;
    }
    try {
      await createCommittee.mutateAsync({
        name: formState.name,
        small_description: formState.small_description,
        large_description: formState.large_description,
        director_name: formState.director_name,
        chair_name: formState.chair_name || null,
        crisis_analysts: [],
        max_delegates: null,
        background_guide_link: null,
        mechanics_guide_link: null,
        character_guide_link: null,
        image_url: null
      });
      setCreateMessage("Committee created.");
      setCreateModalOpen(false);
      setFormState({
        name: "",
        small_description: "",
        large_description: "",
        director_name: "",
        chair_name: ""
      });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create committee.");
    }
  };

  return (
    <main className="page-shell space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface)] p-8 shadow-[var(--ssicsim-shadow)]">
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">Admin</p>
            <h1 className="section-title mt-2">Committee Information</h1>
            <p className="section-subtitle mt-2 max-w-2xl">
              Cleaner view for committee setup, leadership details, and character readiness.
            </p>
          </div>
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>Create Committee</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create Committee</DialogTitle>
                <DialogDescription>Add a new committee profile.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="committee-create-name">Committee name</Label>
                  <Input
                    id="committee-create-name"
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="committee-create-director">Director name</Label>
                    <Input
                      id="committee-create-director"
                      value={formState.director_name}
                      onChange={(event) => setFormState((prev) => ({ ...prev, director_name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="committee-create-chair">Chair name</Label>
                    <Input
                      id="committee-create-chair"
                      value={formState.chair_name}
                      onChange={(event) => setFormState((prev) => ({ ...prev, chair_name: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="committee-create-short">Short description</Label>
                  <Input
                    id="committee-create-short"
                    value={formState.small_description}
                    onChange={(event) => setFormState((prev) => ({ ...prev, small_description: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="committee-create-long">Full description</Label>
                  <Textarea
                    id="committee-create-long"
                    value={formState.large_description}
                    onChange={(event) => setFormState((prev) => ({ ...prev, large_description: event.target.value }))}
                    rows={5}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleCreateCommittee} disabled={createCommittee.isPending}>
                    {createCommittee.isPending ? "Creating..." : "Create committee"}
                  </Button>
                  {createError ? <Badge variant="warning">{createError}</Badge> : null}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Committees</CardDescription>
            <CardTitle className="text-3xl">{stats.totalCommittees}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Characters</CardDescription>
            <CardTitle className="text-3xl">{stats.totalCharacters}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Needs Character Matrix</CardDescription>
            <CardTitle className="text-3xl">{stats.missingCharacters}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Input
                placeholder="Search committees"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="md:max-w-xs"
              />
              <p className="text-sm text-[var(--ssicsim-text-muted)]">
                {committees.length} committee{committees.length === 1 ? "" : "s"} shown
              </p>
            </div>
            {createMessage ? <Badge className="mt-4" variant="success">{createMessage}</Badge> : null}
          </CardContent>
        </Card>

        {committeesQuery.isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading committees...</p>
            </CardContent>
          </Card>
        ) : committeesQuery.isError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-red-700">Failed to load committees.</p>
            </CardContent>
          </Card>
        ) : committees.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[var(--ssicsim-text-muted)]">No committees found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {committees.map((committee) => {
              const count = characterCounts.get(committee.id) ?? 0;
              const isReady = count > 0;
              return (
                <Card key={committee.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{committee.name}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {committee.small_description || "No short description added yet."}
                        </CardDescription>
                      </div>
                      <Badge variant={isReady ? "success" : "warning"}>
                        {isReady ? "Ready" : "Needs setup"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-[var(--ssicsim-text-muted)]">Director</p>
                      <p className="font-medium text-[var(--ssicsim-brand-navy)]">
                        {committee.director_name ?? "--"}
                      </p>
                      <p className="text-[var(--ssicsim-text-muted)]">Characters</p>
                      <p className="font-medium text-[var(--ssicsim-brand-navy)]">{count}</p>
                    </div>
                    <div>
                      <Link className="text-sm font-semibold" href={`/committees/${committee.id}/edit`}>
                        Open full details
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
