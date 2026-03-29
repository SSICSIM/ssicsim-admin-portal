import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight">Main Dashboard</h1>
        <p className="mt-2 text-sm text-white/70">
          Navigate between committee configuration and delegate assignments.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Committee Information</CardTitle>
            <CardDescription>Update committee details, guides, and character matrices.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm text-white/80 underline" href="/committees">
              Open committees
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delegates</CardTitle>
            <CardDescription>Manage delegate records and assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm text-white/80 underline" href="/delegates">
              Open delegates
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
