import Link from "next/link";

import { CommitteesList } from "@/components/CommitteesList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const quickCards = [
  {
    href: "/committees",
    label: "Committees",
    title: "Committee Information",
    description: "Update committee profiles, guides, and character readiness."
  },
  {
    href: "/delegates",
    label: "Delegates",
    title: "Delegates",
    description: "Assign delegates, edit records, and keep statuses current."
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    title: "Overview",
    description: "See your core admin entry points in one clean surface."
  }
];

export default function HomePage() {
  return (
    <main className="page-shell space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface)] p-8 shadow-[var(--ssicsim-shadow)]">
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(211,175,55,0.08)_0%,transparent_70%)]" />
        <p className="section-eyebrow">SSICSIM Operations</p>
        <h1 className="section-title mt-2">Admin Portal</h1>
        <p className="section-subtitle mt-2 max-w-2xl">
          A cleaner control panel for committee coordination and delegate workflows.
        </p>
        <div className="mt-6">
          <a
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--ssicsim-text-muted)] hover:border-[var(--ssicsim-brand-gold)] hover:text-[var(--ssicsim-brand-gold)] transition-all"
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
          >
            <span>Open API Docs</span>
            <span className="text-xs">↗</span>
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {quickCards.map((card) => (
          <Card key={card.href} className="group transition-all duration-150 hover:border-[var(--ssicsim-brand-gold)]/40">
            <CardHeader>
              <p className="section-eyebrow">{card.label}</p>
              <CardTitle className="mt-1 text-lg">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ssicsim-brand-gold)] hover:text-[var(--ssicsim-brand-gold-bright)] transition-colors"
                href={card.href}
              >
                Open section
                <span className="text-xs transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>

      <CommitteesList />
    </main>
  );
}
