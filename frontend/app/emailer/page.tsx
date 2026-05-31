"use client";

import { useRef, useState, useMemo } from "react";

import Link from "next/link";

import {
  useCharacters,
  useCommittees,
  useDelegates,
  useDelegations,
  useEmailTemplates
} from "@/hooks/useAdminQueries";
import { adminService } from "@/services/admin";
import type { DelegateOut, DelegateStatus, UUID } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// ─── placeholders ─────────────────────────────────────────────────────────────

const PLACEHOLDERS = [
  { key: "preferred_name", label: "Preferred Name" },
  { key: "first_name",     label: "First Name" },
  { key: "last_name",      label: "Last Name" },
  { key: "full_name",      label: "Full Name" },
  { key: "email",          label: "Email" },
  { key: "grade",          label: "Grade" },
  { key: "committee",      label: "Committee" },
  { key: "character",      label: "Character" },
  { key: "delegation",     label: "Delegation" }
];

// ─── types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;
type RecipientData = Record<string, string>;
type SendResult = { email: string; success: boolean; error?: string };

// ─── component ────────────────────────────────────────────────────────────────

export default function EmailerPage() {
  const committeesQuery  = useCommittees();
  const delegatesQuery   = useDelegates();
  const delegationsQuery = useDelegations();
  const charactersQuery  = useCharacters();
  const templatesQuery   = useEmailTemplates();

  const committees  = committeesQuery.data  ?? [];
  const delegates   = delegatesQuery.data   ?? [];
  const delegations = delegationsQuery.data ?? [];
  const characters  = charactersQuery.data  ?? [];
  const dbTemplates = templatesQuery.data   ?? [];

  // step
  const [step, setStep] = useState<Step>(1);

  // step 1 — audience
  const [statusFilter,     setStatusFilter]     = useState<DelegateStatus | "all">("all");
  const [committeeFilter,  setCommitteeFilter]  = useState<UUID | "all">("all");
  const [delegationFilter, setDelegationFilter] = useState<UUID | "all">("all");

  // step 2 — template (selectedTemplateId is the DB template's UUID, or null for custom)
  const [selectedTemplateId, setSelectedTemplateId] = useState<UUID | null>(null);
  const [subject, setSubject] = useState("");
  const [body,    setBody]    = useState("Dear {preferred_name},\n\n");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // step 3 — send
  const [sending,          setSending]          = useState(false);
  const [results,          setResults]          = useState<SendResult[] | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState(false);
  const [confirmStatusMsg, setConfirmStatusMsg] = useState<string | null>(null);

  // step 3 — validation warnings (null = not yet run, [] = all valid)
  const [validationWarnings, setValidationWarnings] = useState<{ email: string; reason: string }[] | null>(null);
  const [awaitingConfirm,    setAwaitingConfirm]    = useState(false);

  // ── derived maps ────────────────────────────────────────────────────────────

  const committeeMap  = useMemo(() => new Map(committees.map(c => [c.id, c])),  [committees]);
  const delegationMap = useMemo(() => new Map(delegations.map(d => [d.id, d])), [delegations]);

  const charByDelegate = useMemo(() => {
    const map = new Map<UUID, typeof characters[number]>();
    characters.forEach(c => { if (c.delegate_id) map.set(c.delegate_id, c); });
    return map;
  }, [characters]);

  // ── filtered recipients ─────────────────────────────────────────────────────

  const selectedDelegates = useMemo(() => delegates.filter(d => {
    if (statusFilter !== "all" && d.delegate_status !== statusFilter) return false;
    if (committeeFilter !== "all") {
      const ch = charByDelegate.get(d.id);
      if (!ch || ch.committee_id !== committeeFilter) return false;
    }
    if (delegationFilter !== "all" && d.delegation_id !== delegationFilter) return false;
    return true;
  }), [delegates, statusFilter, committeeFilter, delegationFilter, charByDelegate]);

  const activeTemplate = dbTemplates.find(t => t.id === selectedTemplateId) ?? null;

  // delegates in the audience that are "Assigned" (candidates for → Confirmed)
  const assignedInAudience = useMemo(
    () => selectedDelegates.filter(d => d.delegate_status === "Assigned"),
    [selectedDelegates]
  );

  // ── recipient data builder ──────────────────────────────────────────────────

  function buildData(d: DelegateOut): RecipientData {
    const ch  = charByDelegate.get(d.id);
    const com = ch ? committeeMap.get(ch.committee_id) : null;
    const del = d.delegation_id ? delegationMap.get(d.delegation_id) : null;
    return {
      first_name:     d.first_name,
      last_name:      d.last_name,
      full_name:      d.full_name ?? `${d.first_name} ${d.last_name}`,
      preferred_name: d.preferred_name ?? d.first_name,
      email:          d.email,
      grade:          d.grade ?? "",
      committee:      com?.name ?? "",
      character:      ch?.name  ?? "",
      delegation:     del?.name ?? "Independent Delegate"
    };
  }

  // ── template picker ─────────────────────────────────────────────────────────

  function applyTemplate(id: UUID) {
    const tpl = dbTemplates.find(t => t.id === id);
    if (!tpl) return;
    setSelectedTemplateId(id);
    setSubject(tpl.subject_template);
    setBody(tpl.body_template);
  }

  // ── insert placeholder at cursor ────────────────────────────────────────────

  function insertPlaceholder(key: string) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const token = `{${key}}`;
    setBody(prev => prev.slice(0, start) + token + prev.slice(end));
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + token.length;
      el.focus();
    });
  }

  // ── send + optional status promotion ───────────────────────────────────────

  // ── send: validate → warn → queue ──────────────────────────────────────────

  async function handleSend() {
    setResults(null);
    setConfirmStatusMsg(null);
    setValidationWarnings(null);
    setAwaitingConfirm(false);
    setSending(true);

    // Phase 1 — validate (best-effort; DNS issues won't block sending)
    try {
      const emails = selectedDelegates.map(d => d.email);
      const validations = await adminService.validateEmails(emails);
      const warnings = validations
        .filter(v => !v.valid)
        .map(v => ({ email: v.email, reason: v.reason ?? "Unknown issue" }));

      if (warnings.length > 0) {
        setValidationWarnings(warnings);
        setAwaitingConfirm(true);
        setSending(false);
        return; // wait for the user to confirm or cancel
      }
    } catch {
      // validation endpoint unavailable — skip and send anyway
    }

    setSending(false);
    await doQueue();
  }

  async function doQueue() {
    setSending(true);
    setResults(null);
    setConfirmStatusMsg(null);

    try {
      const recipients = selectedDelegates.map(buildData);
      const res = await adminService.queueEmails({ recipients, subject, body });

      if (res.error) {
        setResults([{ email: "all", success: false, error: res.error }]);
        return;
      }

      // Show optimistic queued state for every recipient
      setResults(selectedDelegates.map(d => ({ email: d.email, success: true })));

      // Promote Assigned → Confirmed if the template requests it
      if (activeTemplate?.confirms_assigned && assignedInAudience.length > 0) {
        setConfirmingStatus(true);
        try {
          await Promise.all(
            assignedInAudience.map(d =>
              adminService.updateDelegate(d.id, { delegate_status: "Confirmed" })
            )
          );
          setConfirmStatusMsg(
            `${assignedInAudience.length} delegate${assignedInAudience.length !== 1 ? "s" : ""} marked as Confirmed.`
          );
        } catch {
          setConfirmStatusMsg("Emails queued but status update failed — update manually.");
        } finally {
          setConfirmingStatus(false);
        }
      }
    } catch (err) {
      setResults([{ email: "all", success: false, error: String(err) }]);
    } finally {
      setSending(false);
    }
  }

  // ── nav guards ──────────────────────────────────────────────────────────────

  const canAdvance =
    step === 1 ? selectedDelegates.length > 0 :
    step === 2 ? subject.trim().length > 0 && body.trim().length > 0 :
    false;

  const isDone = results !== null;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[calc(100vh-57px)]">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-[var(--ssicsim-brand-navy)]">
        <div className="flex flex-col gap-1 p-4 pt-8">
          {([
            { number: 1 as Step, label: "Select Audience" },
            { number: 2 as Step, label: "Choose a Template" },
            { number: 3 as Step, label: "Confirm Send" }
          ]).map(s => {
            const isActive   = step === s.number;
            const isComplete = step > s.number;
            return (
              <button
                key={s.number}
                onClick={() => isComplete && setStep(s.number)}
                disabled={!isComplete && !isActive}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all",
                  isActive   ? "bg-[var(--ssicsim-brand-gold-soft)] text-[var(--ssicsim-brand-navy)]" :
                  isComplete ? "text-white/70 hover:bg-white/10 cursor-pointer" :
                               "text-white/35 cursor-default"
                ].join(" ")}
              >
                <span className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                  isActive   ? "border-[var(--ssicsim-brand-gold)] bg-[var(--ssicsim-brand-gold)] text-white" :
                  isComplete ? "border-white/50 text-white/60" :
                               "border-white/20 text-white/25"
                ].join(" ")}>
                  {s.number}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col bg-white">
        <div className="flex flex-1 flex-col p-10 max-w-3xl">

          <h1 className="text-3xl font-bold text-[var(--ssicsim-brand-navy)] [font-family:var(--font-heading)]">
            Email Manager
          </h1>
          <p className="mt-1 text-sm text-[var(--ssicsim-text-muted)]">
            <span className="font-semibold text-[var(--ssicsim-brand-navy)] underline">
              Step {step}
            </span>
            {step === 1 && ": Select Audience"}
            {step === 2 && ": Choose a Template"}
            {step === 3 && ": Confirm Send"}
          </p>

          <div className="mt-8 flex-1 space-y-6">

            {/* ── Step 1 ── */}
            {step === 1 && (
              <>
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Delegates Assigned</Label>
                    <Select value={statusFilter} onValueChange={v => setStatusFilter(v as DelegateStatus | "all")}>
                      <SelectTrigger><SelectValue placeholder="All delegates" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Delegates</SelectItem>
                        <SelectItem value="Awaiting Payment">Awaiting Payment</SelectItem>
                        <SelectItem value="Awaiting Assignment">Awaiting Assignment</SelectItem>
                        <SelectItem value="Assigned">Assigned</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Committees</Label>
                    <Select value={committeeFilter} onValueChange={v => setCommitteeFilter(v as UUID | "all")}>
                      <SelectTrigger><SelectValue placeholder="All committees" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Committees</SelectItem>
                        {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Delegations</Label>
                    <Select value={delegationFilter} onValueChange={v => setDelegationFilter(v as UUID | "all")}>
                      <SelectTrigger><SelectValue placeholder="All delegations" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Delegations</SelectItem>
                        {delegations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDelegates.length > 0 ? (
                  <div className="rounded-xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-4">
                    <p className="text-sm font-semibold text-[var(--ssicsim-brand-navy)]">
                      {selectedDelegates.length} recipient{selectedDelegates.length !== 1 ? "s" : ""} selected
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedDelegates.slice(0, 14).map(d => (
                        <span key={d.id} className="rounded-full border border-[var(--ssicsim-border)] bg-white px-2.5 py-0.5 text-xs text-[var(--ssicsim-text)]">
                          {d.preferred_name ?? d.first_name} {d.last_name}
                        </span>
                      ))}
                      {selectedDelegates.length > 14 && (
                        <span className="rounded-full border border-[var(--ssicsim-border)] bg-white px-2.5 py-0.5 text-xs text-[var(--ssicsim-text-muted)]">
                          +{selectedDelegates.length - 14} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--ssicsim-text-muted)]">No delegates match the current filters.</p>
                )}
              </>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <>
                {/* Template picker */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Template</Label>
                    <Link
                      href="/emailer/templates"
                      target="_blank"
                      className="text-xs font-medium text-[var(--ssicsim-brand-gold)] hover:underline"
                    >
                      Manage templates ↗
                    </Link>
                  </div>

                  {templatesQuery.isLoading ? (
                    <p className="text-sm text-[var(--ssicsim-text-muted)]">Loading templates…</p>
                  ) : dbTemplates.length === 0 ? (
                    <div className="rounded-xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] px-4 py-3 text-sm text-[var(--ssicsim-text-muted)]">
                      No templates saved yet.{" "}
                      <Link href="/emailer/templates" target="_blank" className="font-medium text-[var(--ssicsim-brand-gold)] hover:underline">
                        Create one ↗
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {dbTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t.id)}
                          className={[
                            "rounded-xl border p-3.5 text-left transition-all",
                            selectedTemplateId === t.id
                              ? "border-[var(--ssicsim-brand-gold)] bg-[var(--ssicsim-brand-gold-soft)]"
                              : "border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] hover:border-[var(--ssicsim-brand-gold)]/50"
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--ssicsim-brand-navy)]">{t.name}</p>
                            {t.confirms_assigned && (
                              <span className="shrink-0 rounded-full border border-[var(--ssicsim-brand-gold)]/40 bg-[var(--ssicsim-brand-gold-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ssicsim-brand-gold)]">
                                Confirms
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[var(--ssicsim-text-muted)] font-mono leading-relaxed line-clamp-1">
                            {t.subject_template}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Email subject…"
                  />
                </div>

                {/* Placeholder chips */}
                <div className="space-y-2">
                  <Label>Insert placeholder</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => insertPlaceholder(p.key)}
                        className="rounded-full border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] px-2.5 py-0.5 font-mono text-xs text-[var(--ssicsim-brand-navy)] transition-colors hover:border-[var(--ssicsim-brand-gold)] hover:bg-[var(--ssicsim-brand-gold-soft)]"
                      >
                        {`{${p.key}}`}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--ssicsim-text-muted)]">Click to insert at cursor.</p>
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <Label htmlFor="email-body">Body</Label>
                  <textarea
                    id="email-body"
                    ref={bodyRef}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={12}
                    className="w-full rounded-lg border border-[var(--ssicsim-border)] bg-white px-3 py-2.5 font-mono text-sm text-[var(--ssicsim-text)] placeholder:text-[var(--ssicsim-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ssicsim-brand-gold)] focus-visible:ring-offset-2 resize-y"
                  />
                </div>

              </>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <>
                {/* Summary card */}
                <div className="rounded-xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--ssicsim-brand-navy)]">
                      {selectedDelegates.length} email{selectedDelegates.length !== 1 ? "s" : ""} to send
                    </p>
                    {activeTemplate && (
                      <span className="rounded-full border border-[var(--ssicsim-border)] bg-white px-2.5 py-0.5 text-xs font-medium text-[var(--ssicsim-brand-navy)]">
                        {activeTemplate.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--ssicsim-text-muted)]">
                    Subject: <span className="font-medium text-[var(--ssicsim-text)]">{subject}</span>
                  </p>
                </div>

                {/* Confirms-assigned callout */}
                {activeTemplate?.confirms_assigned && assignedInAudience.length > 0 && (
                  <div className="rounded-xl border border-[var(--ssicsim-brand-gold)]/40 bg-[var(--ssicsim-brand-gold-soft)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--ssicsim-brand-navy)]">
                      Status update included
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--ssicsim-text-muted)]">
                      After sending, <strong className="text-[var(--ssicsim-brand-navy)]">{assignedInAudience.length} Assigned delegate{assignedInAudience.length !== 1 ? "s" : ""}</strong> will be automatically moved to <strong className="text-[var(--ssicsim-brand-navy)]">Confirmed</strong>.
                    </p>
                  </div>
                )}

                {/* Recipient list */}
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-[var(--ssicsim-brand-navy)]">Recipients</p>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--ssicsim-border)]">
                    {selectedDelegates.map(d => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between border-b border-[var(--ssicsim-border)] px-3 py-2 last:border-0 text-sm"
                      >
                        <span className="font-medium text-[var(--ssicsim-text)]">
                          {d.preferred_name ?? d.first_name} {d.last_name}
                        </span>
                        <span className="text-[var(--ssicsim-text-muted)] truncate max-w-[200px]">{d.email}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Send results */}
                {results && (
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-[var(--ssicsim-brand-navy)]">Results</p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {results.map((r, i) => (
                        <div key={i} className={[
                          "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                          r.success
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-red-200 bg-red-50 text-red-700"
                        ].join(" ")}>
                          <span>{r.email}</span>
                          <span className="font-medium">{r.success ? "Queued ✓" : r.error ?? "Failed"}</span>
                        </div>
                      ))}
                    </div>
                    {confirmingStatus && (
                      <p className="text-xs text-[var(--ssicsim-text-muted)]">Updating delegate statuses…</p>
                    )}
                    {confirmStatusMsg && (
                      <p className="text-xs font-medium text-[var(--ssicsim-brand-navy)]">{confirmStatusMsg}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Validation warning — shown between recipient list and footer buttons */}
          {awaitingConfirm && validationWarnings && validationWarnings.length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800">
                {validationWarnings.length} address{validationWarnings.length !== 1 ? "es" : ""} flagged — emails may not be delivered
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {validationWarnings.map(w => (
                  <div key={w.email} className="text-xs text-amber-700">
                    <span className="font-mono font-medium">{w.email}</span>
                    <span className="text-amber-600"> — {w.reason}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600">
                These will still be passed to the worker. Invalid addresses will fail at the SMTP level.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={doQueue}
                  disabled={sending}
                >
                  {sending ? "Queueing…" : "Send anyway"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAwaitingConfirm(false); setValidationWarnings(null); }}
                  disabled={sending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-6 flex items-center justify-between border-t border-[var(--ssicsim-border)] pt-5">
            <Button
              variant="ghost"
              onClick={() => {
                setResults(null);
                setConfirmStatusMsg(null);
                setValidationWarnings(null);
                setAwaitingConfirm(false);
                setStep(p => (p > 1 ? (p - 1) as Step : p));
              }}
              disabled={step === 1 || isDone}
            >
              Back
            </Button>

            {step < 3 ? (
              <Button onClick={() => setStep(p => (p + 1) as Step)} disabled={!canAdvance}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={sending || isDone || awaitingConfirm}>
                {sending
                  ? awaitingConfirm ? "Queueing…" : "Checking emails…"
                  : isDone
                  ? "Done"
                  : `Queue ${selectedDelegates.length} email${selectedDelegates.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
