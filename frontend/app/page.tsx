import Link from "next/link";

import { CommitteesList } from "@/components/CommitteesList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight">SSICSIM Admin Portal</h1>
        <p className="mt-2 text-sm text-white/70">
          Quick entry points for committee configuration and delegate management. API docs live at{" "}
          <a className="underline" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            /docs
          </a>
          .
        </p>
        <div className="mt-4">
          <Link className="text-sm text-white/80 underline" href="/dashboard">
            Go to main dashboard
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Committee Information</CardTitle>
            <CardDescription>Edit committee details, guides, and uploads.</CardDescription>
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
            <CardDescription>Track delegate status and assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm text-white/80 underline" href="/delegates">
              Open delegates
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Health</CardTitle>
            <CardDescription>Quick overview of committee readiness.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm text-white/80 underline" href="/committees">
              Review committees
            </Link>
          </CardContent>
        </Card>
      </section>

      <CommitteesList />
    </main>
  );
}

