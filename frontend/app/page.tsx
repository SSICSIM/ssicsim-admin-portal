import { CommitteesList } from "@/components/CommitteesList";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight">SSICSIM Admin Portal</h1>
        <p className="mt-2 text-sm text-white/70">
          Starter scaffold. API docs live at{" "}
          <a className="underline" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            /docs
          </a>
          .
        </p>
        <div className="mt-6">
          <CommitteesList />
        </div>
      </div>
    </main>
  );
}

