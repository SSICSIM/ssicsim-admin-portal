import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <main className="page-shell space-y-6">
      <header className="rounded-3xl border border-[var(--ssicsim-border)] bg-white p-7 shadow-[var(--ssicsim-shadow)]">
        <p className="section-eyebrow">Control Center</p>
        <h1 className="section-title mt-2">Main Dashboard</h1>
        <p className="section-subtitle mt-2">Jump between committee management and delegate assignments.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Committee Information</CardTitle>
            <CardDescription>Update committee descriptions, resources, and character readiness.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm font-semibold" href="/committees">
              Open committees
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delegates</CardTitle>
            <CardDescription>Manage delegate records, assignment flow, and confirmation states.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm font-semibold" href="/delegates">
              Open delegates
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
