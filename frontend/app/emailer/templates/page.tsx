"use client";

import { useState } from "react";

import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate
} from "@/hooks/useAdminQueries";
import type { EmailTemplateOut, UUID } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── default seed templates ────────────────────────────────────────────────────

const SEED_TEMPLATES = [
  {
    name: "Assignment Notification",
    subject_template: "Your SSICSIM 2026 Committee Assignment — {committee}",
    body_template: [
      "Dear {preferred_name},",
      "",
      "We are thrilled to let you know that you have been officially assigned to {committee} as {character} for SSICSIM 2026!",
      "",
      "Please take a moment to review your assignment. If you have any questions, feel free to reach out to your committee director.",
      "",
      "We can't wait to see you at the conference!",
      "",
      "Warm regards,",
      "The SSICSIM Team"
    ].join("\n"),
    confirms_assigned: true,
    placeholders: ["preferred_name", "committee", "character"]
  },
  {
    name: "Waitlist Notification",
    subject_template: "SSICSIM 2026 — Application Update",
    body_template: [
      "Dear {preferred_name},",
      "",
      "Thank you for applying to SSICSIM 2026. We appreciate your interest and the time you took to complete your application.",
      "",
      "At this time, you have been placed on our waitlist. We will be in touch as soon as a spot becomes available.",
      "",
      "Thank you for your patience and your continued interest in SSICSIM.",
      "",
      "Warm regards,",
      "The SSICSIM Team"
    ].join("\n"),
    confirms_assigned: false,
    placeholders: ["preferred_name"]
  },
  {
    name: "Payment Reminder",
    subject_template: "SSICSIM 2026 — Payment Reminder",
    body_template: [
      "Dear {preferred_name},",
      "",
      "This is a friendly reminder that payment for SSICSIM 2026 is still outstanding.",
      "",
      "To secure your spot at the conference, please submit your payment at your earliest convenience. If you have any questions or concerns, please don't hesitate to reach out.",
      "",
      "Best regards,",
      "The SSICSIM Team"
    ].join("\n"),
    confirms_assigned: false,
    placeholders: ["preferred_name"]
  },
  {
    name: "Payment Confirmed",
    subject_template: "SSICSIM 2026 Registration Payment Confirmed",
    body_template: [
      "Dear {preferred_name},",
      "",
      "Thank you for your payment. We have received and recorded it, and your registration for SSICSIM 2026 is confirmed.",
      "",
      "We have also acknowledged your committee preferences and will do our best to place you in your first-choice committee. Background guides are expected to be released toward the end of July, followed by committee assignments in August.",
      "",
      "Additional information and event updates will be shared as the conference approaches. Should you have any logistical questions in the meantime, please do not hesitate to contact us. We are always happy to help.",
      "",
      "We look forward to welcoming you to SSICSIM 2026.",
      "",
      "Best regards,",
      "The SSICSIM Team"
    ].join("\n"),
    confirms_assigned: false,
    confirms_payment: true,
    placeholders: ["preferred_name"]
  }
];

// ─── blank form state ──────────────────────────────────────────────────────────

type FormState = {
  name: string;
  subject_template: string;
  body_template: string;
  confirms_assigned: boolean;
  confirms_payment: boolean;
};

const BLANK: FormState = {
  name: "",
  subject_template: "",
  body_template: "Dear {preferred_name},\n\n",
  confirms_assigned: false,
  confirms_payment: false
};

// ─── component ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const templatesQuery = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();

  const templates = templatesQuery.data ?? [];

  // which template is being edited (null = none, "new" = create form)
  const [editingId, setEditingId] = useState<UUID | "new" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  function startNew() {
    setForm(BLANK);
    setError(null);
    setEditingId("new");
  }

  function startEdit(t: EmailTemplateOut) {
    setForm({
      name: t.name,
      subject_template: t.subject_template,
      body_template: t.body_template,
      confirms_assigned: t.confirms_assigned,
      confirms_payment: t.confirms_payment
    });
    setError(null);
    setEditingId(t.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    if (!form.name.trim() || !form.subject_template.trim() || !form.body_template.trim()) {
      setError("Name, subject, and body are all required.");
      return;
    }
    try {
      if (editingId === "new") {
        await createTemplate.mutateAsync(form);
      } else if (editingId) {
        await updateTemplate.mutateAsync({ id: editingId, data: form });
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template.");
    }
  }

  async function handleDelete(id: UUID) {
    try {
      await deleteTemplate.mutateAsync(id);
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template.");
    }
  }

  async function handleSeedDefaults() {
    setSeeding(true);
    setError(null);
    const existingNames = new Set(templates.map((t) => t.name));
    for (const seed of SEED_TEMPLATES) {
      if (!existingNames.has(seed.name)) {
        try {
          await createTemplate.mutateAsync(seed);
        } catch {
          // skip conflicts silently
        }
      }
    }
    setSeeding(false);
  }

  const isBusy = createTemplate.isPending || updateTemplate.isPending || deleteTemplate.isPending;

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <main className="page-shell max-w-4xl space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden rounded-3xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface)] p-8 shadow-[var(--ssicsim-shadow)]">
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">Emailer</p>
            <h1 className="section-title mt-2">Email Templates</h1>
            <p className="section-subtitle mt-2">
              Create and manage reusable templates. Use{" "}
              <span className="font-mono text-[var(--ssicsim-brand-gold)]">{`{placeholder}`}</span>{" "}
              syntax for personalisation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.length === 0 && (
              <Button variant="secondary" onClick={handleSeedDefaults} disabled={seeding}>
                {seeding ? "Adding…" : "Add default templates"}
              </Button>
            )}
            <Button onClick={startNew} disabled={editingId === "new"}>
              + New Template
            </Button>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create form */}
      {editingId === "new" && (
        <TemplateForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={cancelEdit}
          isBusy={isBusy}
          isNew
        />
      )}

      {/* Template list */}
      {templatesQuery.isLoading ? (
        <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading templates…</p>
      ) : templates.length === 0 && editingId !== "new" ? (
        <div className="rounded-2xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface)] p-8 text-center">
          <p className="font-semibold text-[var(--ssicsim-brand-navy)]">No templates yet</p>
          <p className="mt-1 text-sm text-[var(--ssicsim-text-muted)]">
            Click <strong>Add default templates</strong> to seed the built-in set, or create your
            own.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id}>
              {editingId === t.id ? (
                <TemplateForm
                  form={form}
                  onChange={setForm}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                  onDelete={() => handleDelete(t.id)}
                  isBusy={isBusy}
                  isNew={false}
                />
              ) : (
                <TemplateCard template={t} onEdit={() => startEdit(t)} />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onEdit }: { template: EmailTemplateOut; onEdit: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface)] p-5 shadow-[var(--ssicsim-shadow)]">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-[var(--ssicsim-brand-navy)] [font-family:var(--font-heading)] text-lg">
              {template.name}
            </h2>
            {template.confirms_assigned && (
              <span className="rounded-full border border-[var(--ssicsim-brand-gold)]/40 bg-[var(--ssicsim-brand-gold-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ssicsim-brand-gold)]">
                Confirms Assigned → Confirmed
              </span>
            )}
            {template.confirms_payment && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                Verify Payment → Awaiting Assignment
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--ssicsim-text-muted)]">
            <span className="font-medium text-[var(--ssicsim-text)]">Subject:</span>{" "}
            {template.subject_template}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--ssicsim-text)] leading-relaxed line-clamp-3">
            {template.body_template}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}

// ─── TemplateForm ─────────────────────────────────────────────────────────────

function TemplateForm({
  form,
  onChange,
  onSave,
  onCancel,
  onDelete,
  isBusy,
  isNew
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  isBusy: boolean;
  isNew: boolean;
}) {
  const set = (key: keyof FormState, value: string | boolean) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--ssicsim-brand-gold)]/50 bg-[var(--ssicsim-surface)] p-6 shadow-[var(--ssicsim-shadow)] space-y-4">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />

      <h2 className="font-bold text-[var(--ssicsim-brand-navy)] [font-family:var(--font-heading)] text-lg">
        {isNew ? "New Template" : "Edit Template"}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tpl-name">Template name</Label>
          <Input
            id="tpl-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Assignment Notification"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tpl-subject">Subject</Label>
          <Input
            id="tpl-subject"
            value={form.subject_template}
            onChange={(e) => set("subject_template", e.target.value)}
            placeholder="e.g. Your assignment — {committee}"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tpl-body">Body</Label>
        <textarea
          id="tpl-body"
          value={form.body_template}
          onChange={(e) => set("body_template", e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-[var(--ssicsim-border)] bg-white px-3 py-2.5 font-mono text-sm text-[var(--ssicsim-text)] placeholder:text-[var(--ssicsim-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ssicsim-brand-gold)] focus-visible:ring-offset-2 resize-y"
          placeholder={"Dear {preferred_name},\n\n"}
        />
        <p className="text-xs text-[var(--ssicsim-text-muted)]">
          Available placeholders:{" "}
          {[
            "preferred_name",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "grade",
            "committee",
            "character",
            "delegation"
          ].map((p) => (
            <span key={p} className="font-mono">
              {`{${p}}`}{" "}
            </span>
          ))}
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.confirms_assigned}
          onChange={(e) => set("confirms_assigned", e.target.checked)}
          className="h-4 w-4 accent-[var(--ssicsim-brand-gold)]"
        />
        <span className="text-sm font-medium text-[var(--ssicsim-text)]">
          Mark Assigned delegates as Confirmed after sending
        </span>
      </label>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.confirms_payment}
          onChange={(e) => set("confirms_payment", e.target.checked)}
          className="h-4 w-4 accent-[var(--ssicsim-brand-gold)]"
        />
        <span className="text-sm font-medium text-[var(--ssicsim-text)]">
          Move Verify Payment delegates to Awaiting Assignment after sending
        </span>
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ssicsim-border)] pt-4">
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={isBusy}>
            {isBusy ? "Saving…" : "Save template"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={isBusy}>
            Cancel
          </Button>
        </div>
        {!isNew && onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete} disabled={isBusy}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
