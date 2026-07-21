"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  useCharacters,
  useCommittee,
  useCreateCharacter,
  useDeleteAssignment,
  useDeleteCharacter,
  useDelegates,
  useUpdateCommittee,
  useUploadCommitteeImage
} from "@/hooks/useAdminQueries";
import type { CommitteeUpdate, UUID } from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { parseCharacterCsv } from "@/utils/csv";
import { buildDelegateMap, filterCharactersByCommittee } from "@/utils/committee";

const emptyForm: CommitteeUpdate = {
  name: "",
  small_description: "",
  large_description: "",
  director_name: "",
  director_image_url: "",
  contact_email: "",
  max_delegates: null,
  joint: false,
  double: false,
  background_guide_link: "",
  mechanics_guide_link: "",
  character_guide_link: "",
  image_url: ""
};

export default function CommitteeEditPage() {
  const params = useParams();
  const committeeId = typeof params.id === "string" ? params.id : params.id?.[0];

  // Query hooks
  const committeeQuery = useCommittee(committeeId);
  const charactersQuery = useCharacters();
  const delegatesQuery = useDelegates();
  const updateCommittee = useUpdateCommittee(committeeId ?? "");
  const uploadImage = useUploadCommitteeImage();
  const createCharacter = useCreateCharacter();
  const deleteCharacter = useDeleteCharacter();
  const deleteAssignment = useDeleteAssignment();

  // Local UI state for form editing and feedback (kept explicit instead of a reducer for clarity in this long form).
  const [formState, setFormState] = useState<CommitteeUpdate>(emptyForm);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvProgress, setCsvProgress] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [characterMessage, setCharacterMessage] = useState<string | null>(null);
  const [characterError, setCharacterError] = useState<string | null>(null);

  // useEffect: sync form state when committee data arrives.
  useEffect(() => {
    if (!committeeQuery.data) return;
    setFormState({
      name: committeeQuery.data.name,
      small_description: committeeQuery.data.small_description ?? "",
      large_description: committeeQuery.data.large_description ?? "",
      director_name: committeeQuery.data.director_name ?? "",
      director_image_url: committeeQuery.data.director_image_url ?? "",
      contact_email: committeeQuery.data.contact_email ?? "",
      max_delegates: committeeQuery.data.max_delegates ?? null,
      joint: committeeQuery.data.joint ?? false,
      double: committeeQuery.data.double ?? false,
      background_guide_link: committeeQuery.data.background_guide_link ?? "",
      mechanics_guide_link: committeeQuery.data.mechanics_guide_link ?? "",
      character_guide_link: committeeQuery.data.character_guide_link ?? "",
      image_url: committeeQuery.data.image_url ?? ""
    });
  }, [committeeQuery.data]);

  // useMemo: derived data for rendering lists.
  const committeeCharacters = useMemo(
    () => filterCharactersByCommittee(charactersQuery.data ?? [], committeeId),
    [charactersQuery.data, committeeId]
  );

  const delegateMap = useMemo(
    () => buildDelegateMap(delegatesQuery.data ?? []),
    [delegatesQuery.data]
  );

  // Handlers
  const handleFormChange = (
    key: keyof CommitteeUpdate,
    value: CommitteeUpdate[keyof CommitteeUpdate]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!committeeId) return;
    setSaveMessage(null);
    setSaveError(null);
    try {
      await updateCommittee.mutateAsync(formState);
      setSaveMessage("Committee details updated.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update committee.");
    }
  };

  const handleImageUpload = async () => {
    if (!committeeId || !imageFile) return;
    setUploadMessage(null);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", imageFile);
    try {
      await uploadImage.mutateAsync({ committeeId, formData });
      setUploadMessage("Committee image updated.");
      setImageFile(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to upload image.");
    }
  };

  const handleCsvUpload = async () => {
    if (!committeeId || !csvFile) return;
    setCsvError(null);
    setCsvProgress(null);
    try {
      const entries = await parseCharacterCsv(csvFile, committeeId);
      if (entries.length === 0) {
        setCsvError("CSV file contained no character names.");
        return;
      }
      setCsvProgress(`Uploading ${entries.length} characters...`);
      let successCount = 0;
      let conflictCount = 0;
      for (const entry of entries) {
        if (!entry.committee_id) {
          continue;
        }
        try {
          await createCharacter.mutateAsync(entry);
          successCount += 1;
        } catch (error) {
          conflictCount += 1;
          if (error instanceof Error && error.message.includes("409")) {
            continue;
          }
        }
      }
      if (conflictCount > 0) {
        setCsvError(
          `${conflictCount} character(s) failed due to conflicts. Check that the committee can accept multiple characters.`
        );
      }
      setCsvProgress(`Uploaded ${successCount} character names.`);
      setCsvFile(null);
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : "Unable to parse CSV.");
    }
  };

  const runCharacterMutation = async (
    action: () => Promise<unknown>,
    successMessage: string,
    failureMessage: string
  ) => {
    setCharacterMessage(null);
    setCharacterError(null);
    try {
      await action();
      setCharacterMessage(successMessage);
    } catch (error) {
      setCharacterError(error instanceof Error ? error.message : failureMessage);
    }
  };

  const handleAddCharacter = async () => {
    if (!committeeId || !newCharacterName.trim()) return;
    await runCharacterMutation(
      () =>
        createCharacter.mutateAsync({
          name: newCharacterName.trim(),
          committee_id: committeeId,
          delegate_id: null
        }),
      "Character added.",
      "Unable to add character."
    );
    setNewCharacterName("");
  };

  const handleRemoveCharacter = async (characterId: UUID) => {
    await runCharacterMutation(
      () => deleteCharacter.mutateAsync(characterId),
      "Character removed.",
      "Unable to remove character."
    );
  };

  const handleUnassign = async (delegateId: UUID) => {
    await runCharacterMutation(
      () => deleteAssignment.mutateAsync(delegateId),
      "Delegate unassigned.",
      "Unable to unassign delegate."
    );
  };

  if (committeeQuery.isLoading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading committee...</p>
      </main>
    );
  }

  if (committeeQuery.isError || !committeeQuery.data) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-red-700">Committee not found.</p>
      </main>
    );
  }

  return (
    <main className="page-shell max-w-5xl space-y-6">
      <div className="flex items-center justify-start">
        <Link className="text-sm font-semibold" href="/committees">
          Back to committees
        </Link>
      </div>
      <header className="relative overflow-hidden rounded-3xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface)] p-8 shadow-[var(--ssicsim-shadow)]">
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />
        <p className="section-eyebrow">Committee</p>
        <h1 className="section-title mt-2">{committeeQuery.data.name}</h1>
        <p className="section-subtitle mt-2">Edit committee details and upload resources.</p>
      </header>

      {committeeCharacters.length === 0 ? (
        <Alert>
          <AlertTitle>Character matrix missing</AlertTitle>
          <AlertDescription>
            Upload a character CSV so delegates can be assigned to this committee.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-emerald-300 bg-emerald-50">
          <AlertTitle>Characters ready</AlertTitle>
          <AlertDescription>
            {committeeCharacters.length} character{committeeCharacters.length === 1 ? "" : "s"}{" "}
            loaded.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Committee Details</CardTitle>
          <CardDescription>Update descriptions, leadership, guides, and images.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="committee-name">Committee name</Label>
              <Input
                id="committee-name"
                value={formState.name ?? ""}
                onChange={(event) => handleFormChange("name", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="committee-director">Director name</Label>
              <Input
                id="committee-director"
                value={formState.director_name ?? ""}
                onChange={(event) => handleFormChange("director_name", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="committee-contact-email">Contact email</Label>
              <Input
                id="committee-contact-email"
                type="email"
                value={formState.contact_email ?? ""}
                onChange={(event) => handleFormChange("contact_email", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="committee-max">Max delegates</Label>
              <Input
                id="committee-max"
                type="number"
                min={0}
                value={formState.max_delegates ?? ""}
                onChange={(event) =>
                  handleFormChange(
                    "max_delegates",
                    event.target.value ? Number(event.target.value) : null
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="committee-director-image">Director image URL</Label>
            <Input
              id="committee-director-image"
              value={formState.director_image_url ?? ""}
              onChange={(event) => handleFormChange("director_image_url", event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formState.joint ?? false}
                onChange={(event) => handleFormChange("joint", event.target.checked)}
                className="h-4 w-4 rounded border-[var(--ssicsim-border)]"
              />
              <span className="text-sm font-medium">Joint committee</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formState.double ?? false}
                onChange={(event) => handleFormChange("double", event.target.checked)}
                className="h-4 w-4 rounded border-[var(--ssicsim-border)]"
              />
              <span className="text-sm font-medium">Double delegate</span>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="committee-small">Short description</Label>
            <Input
              id="committee-small"
              value={formState.small_description ?? ""}
              onChange={(event) => handleFormChange("small_description", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="committee-large">Full description</Label>
            <Textarea
              id="committee-large"
              value={formState.large_description ?? ""}
              onChange={(event) => handleFormChange("large_description", event.target.value)}
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="committee-bg">Background guide link</Label>
              <Input
                id="committee-bg"
                value={formState.background_guide_link ?? ""}
                onChange={(event) => handleFormChange("background_guide_link", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="committee-mechanics">Mechanics guide link</Label>
              <Input
                id="committee-mechanics"
                value={formState.mechanics_guide_link ?? ""}
                onChange={(event) => handleFormChange("mechanics_guide_link", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="committee-character">Character guide link</Label>
              <Input
                id="committee-character"
                value={formState.character_guide_link ?? ""}
                onChange={(event) => handleFormChange("character_guide_link", event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} disabled={updateCommittee.isPending}>
              {updateCommittee.isPending ? "Saving..." : "Save committee"}
            </Button>
            {saveMessage ? <Badge variant="success">{saveMessage}</Badge> : null}
            {saveError ? <Badge variant="warning">{saveError}</Badge> : null}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Committee image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleImageUpload}
              disabled={!imageFile || uploadImage.isPending}
            >
              {uploadImage.isPending ? "Uploading..." : "Upload image"}
            </Button>
            {uploadMessage ? <Badge variant="success">{uploadMessage}</Badge> : null}
            {uploadError ? <Badge variant="warning">{uploadError}</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Character Matrix CSV</CardTitle>
          <CardDescription>
            CSV format: header must include{" "}
            <span className="font-semibold text-[var(--ssicsim-brand-navy)]">character_name</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleCsvUpload}
              disabled={!csvFile || createCharacter.isPending}
            >
              {createCharacter.isPending ? "Uploading..." : "Upload CSV"}
            </Button>
            {csvProgress ? <Badge variant="success">{csvProgress}</Badge> : null}
            {csvError ? <Badge variant="warning">{csvError}</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Characters & Assignments</CardTitle>
          <CardDescription>Add, remove, and manage character assignments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1 space-y-2">
              <Label htmlFor="new-character">Add character</Label>
              <Input
                id="new-character"
                value={newCharacterName}
                onChange={(event) => setNewCharacterName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddCharacter();
                  }
                }}
                placeholder="Character name"
              />
            </div>
            <Button
              onClick={handleAddCharacter}
              disabled={!newCharacterName.trim() || createCharacter.isPending}
            >
              {createCharacter.isPending ? "Adding..." : "Add character"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {characterMessage ? <Badge variant="success">{characterMessage}</Badge> : null}
            {characterError ? <Badge variant="warning">{characterError}</Badge> : null}
          </div>

          {committeeCharacters.length === 0 ? (
            <p className="text-sm text-[var(--ssicsim-text-muted)]">No characters yet.</p>
          ) : (
            <div className="rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-3">
              <div className="grid gap-2 text-sm">
                {committeeCharacters.map((character) => {
                  const delegate = character.delegate_id
                    ? delegateMap.get(character.delegate_id)
                    : null;
                  return (
                    <div
                      key={character.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] px-3 py-2 transition-colors hover:border-[var(--ssicsim-brand-gold)]/50"
                    >
                      <div>
                        <p className="font-medium text-[var(--ssicsim-brand-navy)]">
                          {character.name}
                        </p>
                        <p className="text-xs text-[var(--ssicsim-text-muted)]">
                          Assigned to:{" "}
                          {delegate ? `${delegate.last_name}, ${delegate.first_name}` : "--"}
                          {delegate ? ` · ${delegate.delegate_experience}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {delegate ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUnassign(delegate.id)}
                            disabled={deleteAssignment.isPending}
                          >
                            Unassign
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveCharacter(character.id)}
                            disabled={deleteCharacter.isPending}
                          >
                            Remove
                          </Button>
                        )}
                        {delegate ? (
                          <span className="text-xs text-[var(--ssicsim-text-muted)]">
                            Unassign before removing.
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
