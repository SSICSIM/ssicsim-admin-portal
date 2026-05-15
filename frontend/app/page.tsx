import Link from "next/link";

import { CommitteesList } from "@/components/CommitteesList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const quickCards = [
  {
    href: "/committees",
    title: "Committee Information",
    description: "Update committee profiles, guides, and committee readiness."
  },
  {
    href: "/delegates",
    title: "Delegates",
    description: "Assign delegates, edit records, and keep statuses current."
  },
  {
    href: "/dashboard",
    title: "Overview",
    description: "See your core admin entry points in one clean surface."
  }
];

export default function HomePage() {
  return (
    <main className="page-shell space-y-6">
      <header className="rounded-3xl border border-[var(--ssicsim-border)] bg-white p-7 shadow-[var(--ssicsim-shadow)]">
        <p className="section-eyebrow">SSICSIM Operations</p>
        <h1 className="section-title mt-2">Admin Portal</h1>
        <p className="section-subtitle mt-2 max-w-2xl">
          A cleaner control panel for committee coordination and delegate workflows.
        </p>
        <div className="mt-5">
          <a
            className="inline-flex items-center rounded-lg border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] px-3 py-2 text-sm font-semibold"
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
          >
            Open API Docs
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {quickCards.map((card) => (
          <Card key={card.href}>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-sm font-semibold" href={card.href}>
                Open section
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>

      <CommitteesList />
    </main>
  );
}
