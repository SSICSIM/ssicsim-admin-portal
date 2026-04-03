"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCharacters, useCommittees, useCreateCommittee } from "@/hooks/useAdminQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CommitteesPage() {
  // Query hooks
  const [filter, setFilter] = useState("");
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

  // useMemo: derived counts for display.
  const characterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (charactersQuery.data ?? []).forEach((character) => {
      counts.set(character.committee_id, (counts.get(character.committee_id) ?? 0) + 1);
    });
    return counts;
  }, [charactersQuery.data]);

  const committees = (committeesQuery.data ?? []).filter((committee) =>
    committee.name.toLowerCase().includes(filter.toLowerCase())
  );

  // Handlers
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
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Committee Information</CardTitle>
          <CardDescription>
            Manage committee details, guide links, and character matrices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Search committees"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="md:max-w-xs"
            />
            <p className="text-xs text-white/60">
              {committees.length} committee{committees.length === 1 ? "" : "s"} loaded
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">Add new committees as needed.</p>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Create committee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Committee</DialogTitle>
              <DialogDescription>Create a new committee record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="committee-create-name">Committee name</Label>
                  <Input
                    id="committee-create-name"
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
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
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleCreateCommittee} disabled={createCommittee.isPending}>
                  {createCommittee.isPending ? "Creating..." : "Create committee"}
                </Button>
                {createMessage ? <Badge variant="success">{createMessage}</Badge> : null}
                {createError ? <Badge variant="warning">{createError}</Badge> : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent>
          {committeesQuery.isLoading ? (
            <p className="text-sm text-white/60">Loading committees...</p>
          ) : committeesQuery.isError ? (
            <p className="text-sm text-red-300">Failed to load committees.</p>
          ) : committees.length === 0 ? (
            <p className="text-sm text-white/60">No committees found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Committee</TableHead>
                  <TableHead>Director</TableHead>
                  <TableHead>Characters</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {committees.map((committee) => {
                  const count = characterCounts.get(committee.id) ?? 0;
                  return (
                    <TableRow key={committee.id}>
                      <TableCell>
                        <div className="font-medium text-white">{committee.name}</div>
                        {committee.small_description ? (
                          <p className="text-xs text-white/60">{committee.small_description}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{committee.director_name ?? "--"}</TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>
                        {count === 0 ? (
                          <Badge variant="warning">Missing characters</Badge>
                        ) : (
                          <Badge variant="success">Ready</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          className="text-xs text-white/80 underline"
                          href={`/committees/${committee.id}/edit`}
                        >
                          Edit details
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
