# Onboarding

Welcome to the SSICSIM admin portal. This gets you running locally and
points you at the deeper docs — it doesn't repeat them.

## What this is

A web-based admin dashboard for running the SSICSIM conference: committee
setup, delegate records and assignments, and bulk emailing delegates.

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + TanStack Query + Zustand |
| Backend | FastAPI + SQLAlchemy + Alembic + Pydantic |
| Worker | Python (RQ), consumes jobs from Redis |
| Database | PostgreSQL (Supabase in production) |
| Auth | NextAuth (Google OAuth) with an email allowlist |

## Run it locally (Docker — easiest)

```bash
cp .env.example .env
```

Fill in at minimum: `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
`ADMIN_EMAIL_ALLOWLIST` (your email), `ADMIN_API_TOKEN`. Everything else has
working local defaults.

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend (Swagger): http://localhost:8000/docs
- `alembic upgrade head` runs automatically on backend startup.

More detail: [`DOCKER.md`](DOCKER.md).

## Run it without Docker

Backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

You'll need Postgres and Redis running yourself in this mode — see the `.env`
values backend.md describes. Docker is the path of least resistance unless
you specifically need to run one side outside a container.

## Where things live

```
frontend/        Next.js app
  app/            routes (one folder per page, e.g. app/committees/)
  components/ui/  shadcn primitives (Button, Card, Dialog, ...)
  components/page/   generic page scaffolding shared by every list-style page
  components/flows/  generic multi-step wizard scaffolding
  components/<feature>/  feature-specific pieces (forms, cards) for one page
  hooks/          TanStack Query hooks — all data fetching goes through these
  services/       API client methods the hooks call
  types/          shared TS types (mirrors backend Pydantic schemas)

backend/
  app/api/        route handlers
  app/models/     SQLAlchemy models (DB schema)
  app/schemas.py  Pydantic request/response models
  migrations/     Alembic migrations

documentation/    you are here
```

## First things to read next

- [`frontend-pages.md`](frontend-pages.md) — how to build a new admin page or
  multi-step flow, and the Tailwind design tokens.
- [`backend.md`](backend.md) — backend navigation, env vars, running tests,
  migrations.
- [`db.md`](db.md) — SQLAlchemy/Alembic model and migration flow.
- [`security.md`](security.md) — auth model and security notes.
- [`deployment.md`](deployment.md) — how production (Supabase + Render +
  Vercel) is wired, only needed if you're touching deploy config.

## Conventions worth knowing up front

- Frontend data fetching always goes through `hooks/useAdminQueries.ts` —
  never fetch directly inside a page component.
- Don't put feature-specific UI in `components/page/`, `components/flows/`,
  or `components/ui/` — those are shared across every page. A feature's own
  forms/cards/dialogs go in `components/<feature-name>/`.
- Design tokens are CSS variables in `app/globals.css` (`--ssicsim-*`), wired
  into Tailwind as named colors (`bg-brand-navy`, `text-ink-muted`, ...) in
  `tailwind.config.ts` — prefer those over hardcoded hex values.
