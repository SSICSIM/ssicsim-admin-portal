# Deployment Guide

This guide covers running the portal locally, deploying to production (Vercel + Render + Supabase), setting up the custom domain `admin.ssicsim.ca`, and purchasing/configuring it on GoDaddy.

---

## Table of Contents

1. [Running locally](#1-running-locally)
2. [Supabase — managed database](#2-supabase--managed-database)
3. [Render — backend and worker](#3-render--backend-and-worker)
4. [Vercel — frontend](#4-vercel--frontend)
5. [Custom domain on GoDaddy](#5-custom-domain-on-godaddy)
6. [CI/CD pipeline overview](#6-cicd-pipeline-overview)

---

## 1. Running locally

### Prerequisites

- Docker Desktop installed and running
- Node.js 20+ (for local frontend work outside Docker)
- Python 3.12+ (for local backend work outside Docker)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/SSICSIM/ssicsim-admin-portal.git
cd ssicsim-admin-portal

# 2. Copy the example env file and fill in your values
cp .env.example .env
# Edit .env — at minimum set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET

# 3. Start all services
docker-compose up

# 4. In a separate terminal, seed the database (first run only)
docker-compose exec backend python3 scripts/seed_data.py
```

The portal is now available at **http://localhost:3000**.  
The backend API docs are at **http://localhost:8000/docs** (local only — hidden in production).

### Generating a NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### Stopping the stack

```bash
docker-compose down          # stop containers
docker-compose down -v       # stop and wipe database volume (destructive)
```

---

## 2. Supabase — managed database

### Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a new organisation.
2. Click **New Project** → choose a region close to your users (e.g. `us-east-1`).
3. Set a strong database password and save it — you will need it for the connection string.
4. Wait for the project to provision (~1 minute).

### Get the connection string

1. In your Supabase project go to **Settings → Database → Connection string**.
2. Select the **URI** tab and copy the **Direct connection** string (not the pooler):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
3. Replace `[YOUR-PASSWORD]` with the password you set above.

> **Use the Direct connection (port 5432), not the Pooler.** Alembic needs a persistent session-level connection; the pooler (port 6543) is for short-lived application connections.

### Run migrations against Supabase

Run this once from your local machine to create all tables:

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" \
  alembic -c backend/alembic.ini upgrade heads
```

Future schema changes are applied automatically when you publish a GitHub Release (see [CI/CD](#6-cicd-pipeline-overview)).

### Supabase connection security

- Go to **Settings → Database → Connection pooling** — leave the pooler enabled for the app but keep direct access restricted.
- Go to **Settings → API** — your Supabase `anon` and `service_role` keys are **not used** by this project. Only the PostgreSQL connection string is needed.
- Supabase enforces SSL by default on the direct connection. No extra configuration required.

---

## 3. Render — backend and worker

### Create a Redis instance

1. In the [Render dashboard](https://dashboard.render.com), click **New → Redis**.
2. Name it `ssicsim-redis`, choose the **Free** or **Starter** plan.
3. Copy the **Internal URL** — it looks like `redis://red-xxx:6379`. Use this as `REDIS_URL` (internal URLs only work between Render services in the same region).

### Deploy the backend

1. Click **New → Web Service**.
2. Under **Source**, choose **Docker image** → enter:
   ```
   ghcr.io/ssicsim/ssicsim-backend:latest
   ```
   (or connect your GitHub repo and point to `backend/Dockerfile` if using Git deploy).
3. Set the following:

   | Field | Value |
   |---|---|
   | Name | `ssicsim-backend` |
   | Region | Same as Redis |
   | Instance type | Starter ($7/mo) or above |
   | Pre-Deploy Command | `alembic upgrade heads` |
   | Start Command | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |

4. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | Supabase direct connection string |
   | `REDIS_URL` | Render Redis internal URL |
   | `API_CORS_ORIGINS` | `https://admin.ssicsim.ca` |
   | `ADMIN_API_TOKEN` | Generate with `openssl rand -hex 32` |
   | `GMAIL_USER` | Your Gmail address |
   | `GMAIL_APP_PASSWORD` | Gmail App Password |

5. Click **Create Web Service**.

### Deploy the worker

1. Click **New → Background Worker**.
2. Same Docker image as the backend.
3. Set the following:

   | Field | Value |
   |---|---|
   | Name | `ssicsim-worker` |
   | Region | Same as backend and Redis |
   | Start Command | `python -m app.worker` |

4. Same environment variables as the backend (minus `API_CORS_ORIGINS`).
5. Click **Create Background Worker**.

### Get the deploy hooks

For each service (backend + worker):

1. Go to the service → **Settings → Deploy hook**.
2. Click **Generate deploy hook** and copy the URL.
3. Add them as GitHub repository secrets:
   - `RENDER_BACKEND_DEPLOY_HOOK`
   - `RENDER_WORKER_DEPLOY_HOOK`

### GHCR authentication (private image)

If your GitHub repository and image are private, give Render credentials to pull the image:

1. Create a GitHub **Fine-grained personal access token**:
   - Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
   - Repository access: `ssicsim-admin-portal` only.
   - Permission: **Packages: Read**.
2. In each Render service → **Settings → Image → Docker credentials**:
   - Registry: `ghcr.io`
   - Username: your GitHub username
   - Password: the token you just created

---

## 4. Vercel — frontend

### Connect the repository

1. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import your GitHub repository `SSICSIM/ssicsim-admin-portal`.
3. Set **Root Directory** to `frontend/`.
4. Framework preset: **Next.js** (auto-detected).

### Environment variables

Add the following in **Project Settings → Environment Variables** (set for **Production**):

| Key | Value |
|---|---|
| `BACKEND_BASE_URL` | Your Render backend URL e.g. `https://ssicsim-backend.onrender.com` |
| `NEXTAUTH_URL` | `https://admin.ssicsim.ca` |
| `NEXTAUTH_SECRET` | Same value as local (generate with `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `ADMIN_EMAIL_ALLOWLIST` | `tech@ssicsim.ca` |
| `ADMIN_API_TOKEN` | Same value as Render backend |

### Update Google OAuth redirect URIs

In the [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials** → your OAuth 2.0 Client:

- Add to **Authorised JavaScript origins**: `https://admin.ssicsim.ca`
- Add to **Authorised redirect URIs**: `https://admin.ssicsim.ca/api/auth/callback/google`

Vercel will auto-deploy on every push to `main`.

---

## 5. Custom domain on GoDaddy

### Purchase the domain (if not already owned)

1. Go to [godaddy.com](https://godaddy.com) and search for `ssicsim.ca` (or `.com`).
2. Add to cart and complete checkout.
3. Navigate to **My Products → DNS** for the domain.

### Add a subdomain for the frontend (Vercel)

The admin portal will live at `admin.ssicsim.ca` (or `admin.ssicsim.com`).

1. In Vercel → **Project → Settings → Domains** → click **Add Domain**.
2. Enter `admin.ssicsim.ca` and click **Add**.
3. Vercel will show you a DNS record to create. It will be one of:
   - A **CNAME** record pointing to `cname.vercel-dns.com`
   - An **A** record pointing to Vercel's IP

4. In GoDaddy → **My Products → DNS** for your domain, click **Add New Record**:

   | Type | Name | Value | TTL |
   |---|---|---|---|
   | `CNAME` | `admin` | `cname.vercel-dns.com` | 600 |

5. Back in Vercel, click **Verify** — DNS propagation takes 5–30 minutes.
6. Vercel automatically provisions a free SSL certificate via Let's Encrypt. No action needed.

After verification, visiting `https://admin.ssicsim.ca` will load the portal. The Vercel `.app` URL still works but is not shared publicly — the custom domain is the canonical address.

### Keeping the admin portal out of search results

Four layers are already configured in the codebase so `admin.ssicsim.ca` never appears in Google or any other search engine:

| Layer | Where | What it does |
|---|---|---|
| `robots.txt` | `public/robots.txt` | First thing crawlers check — `Disallow: /` blocks the entire site |
| `X-Robots-Tag` header (Next.js config) | `next.config.js` | HTTP header on every response — honoured by all major crawlers even if they skip `robots.txt` |
| `X-Robots-Tag` header (middleware) | `middleware.ts` | Belt-and-suspenders — also set in the request middleware |
| HTML meta tags | `app/layout.tsx` | `<meta name="robots" content="noindex, nofollow">` in the page `<head>` — catches crawlers that render JavaScript |

No action needed on your part — these are live in production as long as the code is deployed.

**If the site was ever indexed before these protections:** Go to [Google Search Console](https://search.google.com/search-console) → **Removals → New Request** → enter `admin.ssicsim.ca` to request immediate removal.

### Vercel domain: making the custom URL the only visible URL

Vercel serves your deployment at both the custom domain and the `.vercel.app` URL. To ensure users only see `admin.ssicsim.ca`:

1. In Vercel → **Project → Settings → Domains**, set `admin.ssicsim.ca` as the **primary domain**.
2. The `.vercel.app` URL remains active (for internal use) but is never shared. Share only the custom domain link.
3. Add `admin.ssicsim.ca` as the `NEXTAUTH_URL` env var so NextAuth only issues cookies for that domain (already done above).

### Add the backend API subdomain (optional — Render)

If you want the backend at `api.ssicsim.ca` instead of a Render URL:

1. In Render → **ssicsim-backend → Settings → Custom Domains** → **Add Custom Domain**.
2. Enter `api.ssicsim.ca`.
3. Render will show a CNAME target (e.g. `ssicsim-backend.onrender.com`).
4. In GoDaddy DNS, add:

   | Type | Name | Value | TTL |
   |---|---|---|---|
   | `CNAME` | `api` | `ssicsim-backend.onrender.com` | 600 |

5. Update `BACKEND_BASE_URL` in Vercel to `https://api.ssicsim.ca`.
6. Update `API_CORS_ORIGINS` in Render to include `https://admin.ssicsim.ca`.

---

## 6. CI/CD pipeline overview

```
PR opened / updated
  └─► pr-checks.yml
        ├─ backend-lint      ruff check + ruff format --check
        ├─ frontend-lint     next lint
        └─ frontend-typecheck  tsc --noEmit
        (All must pass before merge is allowed)

Push to main
  └─► build.yml
        └─ Build backend Docker image
           Push to ghcr.io/ssicsim/ssicsim-backend:latest
        (Vercel deploys the frontend automatically — no action needed)

Release published on GitHub
  └─► deploy.yml
        └─ migrate
              Run alembic upgrade heads against Supabase
              (deploy is cancelled if migration fails)
              │
              ├─► deploy-backend   POST Render deploy hook
              └─► deploy-worker    POST Render deploy hook
```

### GitHub repository secrets required

| Secret | Used in |
|---|---|
| `RENDER_BACKEND_DEPLOY_HOOK` | `deploy.yml` |
| `RENDER_WORKER_DEPLOY_HOOK` | `deploy.yml` |
| `PRODUCTION_DATABASE_URL` | `deploy.yml` (migration step) |

### How to publish a release

1. Merge all PRs for the milestone into `main`.
2. On GitHub → **Releases → Draft a new release**.
3. Choose a tag (e.g. `v1.2.0`), write release notes, click **Publish release**.
4. The `deploy.yml` workflow fires automatically.

### Rolling back

If a bad release goes out:

```bash
# On Render — roll back to the previous deploy
# Go to: Service → Deploys → select a previous deploy → Rollback

# For a database rollback (run locally against Supabase)
DATABASE_URL="postgresql://..." alembic downgrade -1
```
