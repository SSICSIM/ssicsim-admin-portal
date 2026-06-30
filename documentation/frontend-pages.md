# Building Pages in the Admin Portal

This doc covers two things, in order of how often you'll need them:

1. **Creating a new page** — the common case (a list of committees, delegates,
   applicants, whatever) and the components that make it quick to build.
2. **Creating a multi-step flow** — the rarer case where a page is a wizard
   (the email send flow, a hiring process) rather than a list.

## Layering

```
components/ui/          shadcn primitives (Button, Card, Dialog, Input, ...)
components/page/        generic page scaffolding (header, stats, loading/error/empty states)
components/flows/       generic multi-step wizard scaffolding
components/<feature>/   feature-specific pieces — forms, dialogs, tables, cards for ONE page/flow
app/<feature>/page.tsx  thin composition root: layout + state, imports from components/<feature>/
```

`components/ui/*`, `components/page/*`, and `components/flows/*` never know
about a specific feature ("committees", "hiring", ...) — they're shared
across every page. Anything that *is* specific to one feature (the "add
applicant" form, an "applicant card", a "scoring" step body) goes in its own
`components/<feature>/` folder, e.g. `components/applicants/`, not inline in
`app/applicants/page.tsx` and not in the shared folders. The page file itself
stays thin — it owns route-level state and composes pieces from
`components/<feature>/` + `components/page/` (or `components/flows/`).

This keeps `app/<feature>/page.tsx` short and readable, and means a feature's
building blocks (forms, cards, step bodies) all live in one obvious place
instead of growing inside a single giant page file — see how large
`app/delegates/page.tsx` and `app/emailer/page.tsx` have gotten as the thing
to avoid.

## Creating a new page

Almost every admin page (committees, delegates) has the same shape:

```
PageHeader  →  StatRow (optional)  →  filter/search Card  →  QueryState(list or table)
```

### 1. Route

Add `app/<feature>/page.tsx` (a Next.js App Router page is just a default
export from this file — the folder name becomes the URL path).

### 2. Data hooks

Add query/mutation hooks in `frontend/hooks/useAdminQueries.ts` (TanStack
Query, following the existing `useCommittees` / `useCreateCommittee`
pattern), backed by a method on `frontend/services/admin.ts` and a type in
`frontend/types/api.ts`. Reuse these — don't fetch directly inside the page.

### 3. Feature components

Put the feature-specific pieces in `components/applicants/` — the create
form/dialog and the list-item card don't belong in the page file or in the
generic `components/page/` folder:

```tsx
// components/applicants/create-applicant-dialog.tsx
"use client";

import { useState } from "react";

import { useCreateApplicant } from "@/hooks/useAdminQueries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function CreateApplicantDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createApplicant = useCreateApplicant();

  const handleCreate = async () => {
    await createApplicant.mutateAsync({ name });
    setOpen(false);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add applicant</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add applicant</DialogTitle>
          <DialogDescription>Create a new applicant record.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={handleCreate} disabled={createApplicant.isPending}>
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

```tsx
// components/applicants/applicant-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApplicantOut } from "@/types/api";

export function ApplicantCard({ applicant }: { applicant: ApplicantOut }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{applicant.name}</CardTitle>
      </CardHeader>
      <CardContent>{/* status, score, etc. */}</CardContent>
    </Card>
  );
}
```

### 4. Page body

The page itself just owns filter/list state and composes the pieces above
with the generic `components/page/*` scaffolding:

```tsx
// app/applicants/page.tsx
"use client";

import { useMemo, useState } from "react";

import { useApplicants } from "@/hooks/useAdminQueries";
import { PageShell, PageHeader, StatRow, QueryState } from "@/components/page";
import { CreateApplicantDialog } from "@/components/applicants/create-applicant-dialog";
import { ApplicantCard } from "@/components/applicants/applicant-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ApplicantsPage() {
  const [filter, setFilter] = useState("");
  const applicantsQuery = useApplicants();

  const applicants = useMemo(
    () => (applicantsQuery.data ?? []).filter((a) => a.name.toLowerCase().includes(filter.toLowerCase())),
    [applicantsQuery.data, filter]
  );

  return (
    <PageShell>
      <PageHeader
        title="Applicants"
        description="Review and manage hiring applicants."
        action={<CreateApplicantDialog />}
      />

      <StatRow
        stats={[
          { label: "Total applicants", value: applicants.length },
          { label: "Pending review", value: applicants.filter((a) => a.status === "pending").length }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search applicants" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </CardContent>
      </Card>

      <QueryState
        isLoading={applicantsQuery.isLoading}
        isError={applicantsQuery.isError}
        isEmpty={applicants.length === 0}
        emptyLabel="No applicants found."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {applicants.map((a) => (
            <ApplicantCard key={a.id} applicant={a} />
          ))}
        </div>
      </QueryState>
    </PageShell>
  );
}
```

Notice the page file now has almost no markup of its own — it's mostly
wiring. That's the goal: when the feature grows (more filters, more card
variants), that growth happens inside `components/applicants/`, not in the
page.

### 5. Register navigation

Add the route to `links` in `frontend/components/Navbar.tsx` so it shows up
in the top nav.

### Page primitives reference (`frontend/components/page/`)

| Component | Purpose |
|---|---|
| `PageShell` | Top-level `<main>` wrapper with standard page padding/spacing. |
| `PageHeader` | The gold-topped header card: eyebrow, title, description, and an optional top-right `action` (e.g. a "Create" dialog trigger). |
| `StatRow` / `StatCard` | Row of metric cards under the header. |
| `QueryState` | Renders loading/error/empty states for a list, falling through to `children` once data is ready — replaces copy-pasted `isLoading ? ... : isError ? ... : data.length === 0 ? ...` chains. |

These wrap `components/ui/Card` etc. — they don't replace it. Forms, tables,
dialogs inside a page are still built directly from `components/ui/*`.

## Creating a multi-step flow

Use this only when the page is a sequential wizard with its own forward/back
navigation — not just a list with a create dialog. The email send flow
(`app/emailer/page.tsx`) is the existing example; `components/flows/*`
extracts its layout into reusable pieces. Same rule as pages applies: each
step's actual content goes in `components/hiring/`, not inline in the page.

```tsx
// components/hiring/score-candidates-step.tsx
"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function ScoreCandidatesStep({ onNotesChange }: { onNotesChange: (notes: string) => void }) {
  const [notes, setNotes] = useState("");

  return (
    <Card>
      <CardContent className="pt-6">
        <Textarea
          placeholder="Scoring notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            onNotesChange(e.target.value);
          }}
        />
      </CardContent>
    </Card>
  );
}
```

```tsx
// app/hiring/page.tsx
"use client";

import { useState } from "react";

import {
  FlowLayout,
  FlowStepper,
  FlowHeader,
  FlowStepPanel,
  FlowFooterActions
} from "@/components/flows";
import { ReviewApplicantsStep } from "@/components/hiring/review-applicants-step";
import { ScoreCandidatesStep } from "@/components/hiring/score-candidates-step";
import { FinalDecisionStep } from "@/components/hiring/final-decision-step";

type Step = 1 | 2 | 3;

const STEPS = [
  { number: 1, label: "Review Applicants" },
  { number: 2, label: "Score Candidates" },
  { number: 3, label: "Final Decision" }
];

export default function HiringFlowPage() {
  const [step, setStep] = useState<Step>(1);
  const [notes, setNotes] = useState("");
  const canAdvance = step !== 2 || notes.trim().length > 0;

  return (
    <FlowLayout
      sidebar={<FlowStepper steps={STEPS} activeStep={step} onStepSelect={(s) => setStep(s as Step)} />}
    >
      <FlowHeader step={step} totalSteps={STEPS.length} title="Hiring Process" stepLabel={STEPS[step - 1].label} />

      <div className="mt-8 flex-1 space-y-6">
        <FlowStepPanel active={step === 1}>
          <ReviewApplicantsStep />
        </FlowStepPanel>
        <FlowStepPanel active={step === 2}>
          <ScoreCandidatesStep onNotesChange={setNotes} />
        </FlowStepPanel>
        <FlowStepPanel active={step === 3}>
          <FinalDecisionStep />
        </FlowStepPanel>
      </div>

      <FlowFooterActions
        onBack={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
        backDisabled={step === 1}
        primaryLabel={step < 3 ? "Next" : "Submit decision"}
        onPrimary={() => (step < 3 ? setStep((s) => (s + 1) as Step) : handleSubmit())}
        primaryDisabled={!canAdvance}
      />
    </FlowLayout>
  );
}
```

`app/hiring/page.tsx` only holds step navigation state — the actual content
of each step lives in `components/hiring/`.

### Flow primitives reference (`frontend/components/flows/`)

| Component | Purpose |
|---|---|
| `FlowLayout` | Dark sidebar rail + white content pane shell. |
| `FlowStepper` | The sidebar step rail (active/complete/upcoming states). |
| `FlowHeader` | "Title" + "Step N: Label" subhead. |
| `FlowStepPanel` | Renders a step's body only when it's the active step. |
| `FlowFooterActions` | Back / primary action row, built on `Button`. |

## Design tokens

The SSICSIM brand palette lives as CSS variables in `frontend/app/globals.css`
and is wired into `frontend/tailwind.config.ts` as named Tailwind colors.
Prefer the token utility over `bg-[var(--ssicsim-...)]` in new code.

| Tailwind utility | CSS variable | Use |
|---|---|---|
| `bg-bg` / `bg-bg-soft` | `--ssicsim-bg`, `--ssicsim-bg-soft` | Page background |
| `bg-surface` / `bg-surface-soft` | `--ssicsim-surface`, `--ssicsim-surface-soft` | Card/panel surfaces |
| `text-ink` | `--ssicsim-text` | Body text |
| `text-ink-muted` | `--ssicsim-text-muted` | Secondary/muted text |
| `border-border` | `--ssicsim-border` | Default borders |
| `bg-brand-navy` / `text-brand-navy` | `--ssicsim-brand-navy` | Primary brand color, headings, dark sidebar |
| `bg-brand-gold` / `text-brand-gold` | `--ssicsim-brand-gold` | Accent, active states |
| `bg-brand-gold-bright` | `--ssicsim-brand-gold-bright` | Gradient accent (card top border) |
| `bg-brand-gold-soft` | `--ssicsim-brand-gold-soft` | Active step / highlighted background |
| `shadow-ssicsim` | `--ssicsim-shadow` | Standard card shadow |
| `font-heading` | `--font-heading` | Headings (Darker Grotesque) |
| `font-body` | `--font-body` | Body copy (Nunito Sans) |

Existing components still use the `bg-[var(--ssicsim-brand-navy)]`
arbitrary-value form — that still works and doesn't need to be migrated, but
new code should use the named utility (`bg-brand-navy`) for brevity and IDE
autocomplete.
