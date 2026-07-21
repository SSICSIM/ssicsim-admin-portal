import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    href: "/committees",
    eyebrow: "Manage",
    title: "Committee Information",
    description: "Update committee descriptions, resources, and character readiness."
  },
  {
    href: "/delegates",
    eyebrow: "Manage",
    title: "Delegates",
    description: "Manage delegate records, assignment flow, and confirmation states."
  }
];

export default function HomePage() {
  return (
    <main className="page-shell space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface)] p-8 shadow-[var(--ssicsim-shadow)]">
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--ssicsim-brand-gold)] to-[var(--ssicsim-brand-gold-bright)]" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(211,175,55,0.07)_0%,transparent_70%)]" />
        <p className="section-eyebrow">Control Center</p>
        <h1 className="section-title mt-2">Admin Portal</h1>
        <p className="section-subtitle mt-2">
          Jump between committee management and delegate assignments.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card
            key={section.href}
            className="group transition-all duration-150 hover:border-[var(--ssicsim-brand-gold)]/40"
          >
            <CardHeader>
              <p className="section-eyebrow">{section.eyebrow}</p>
              <CardTitle className="mt-1">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ssicsim-brand-gold)] hover:text-[var(--ssicsim-brand-gold-bright)] transition-colors"
                href={section.href}
              >
                Open {section.title.toLowerCase()}
                <span className="text-xs transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
