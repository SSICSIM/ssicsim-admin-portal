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
7. [PR testing environments (staging)](#7-pr-testing-environments-staging)

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

---

## 7. PR testing environments (staging)

Instead of pushing directly to `main` and testing in production, every PR should be tested against isolated staging infrastructure before merge. This section explains how to wire up a staging environment for both `ssicsim-admin-portal` and the main `ssicsim.ca` website.

The goal is a three-tier setup:

| Tier | Branch | Frontend | Backend | Database |
|---|---|---|---|---|
| Production | `main` | `admin.ssicsim.ca` / `ssicsim.ca` | `ssicsim-backend` (Render) | Supabase production project |
| Staging / PR preview | feature branches | Vercel preview URL | `ssicsim-backend-staging` (Render) | Supabase staging project |
| Local | any | `localhost:3000` | `localhost:8000` | Docker Postgres |

---

### Step 1 — Create a Supabase staging project

Do this once. It gives you a real isolated database for all PR previews.

1. In [supabase.com](https://supabase.com), open your organisation and click **New Project**.
2. Name it `ssicsim-staging` (or `ssicsim-admin-staging` for the admin portal).
3. Choose the same region as production.
4. Set a strong password and save it.
5. Wait for provisioning (~1 minute).
6. Go to **Settings → Database → Connection string → URI** and copy the **Direct connection** string:
   ```
   postgresql://postgres:[PASSWORD]@db.[STAGING-REF].supabase.co:5432/postgres
   ```
7. Run migrations against the staging DB from your local machine:
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[STAGING-REF].supabase.co:5432/postgres" \
     alembic -c backend/alembic.ini upgrade heads
   ```

Keep this staging DB separate from production — it can be wiped and reseeded freely.

---

### Step 2 — Create a Render staging backend (admin portal only)

The main `ssicsim.ca` website is frontend-only, so skip to Step 3 if you are working on that repo.

1. In [Render](https://dashboard.render.com), click **New → Web Service**.
2. Connect the same GitHub repo (`ssicsim-admin-portal`), branch: `main` (Render will always pull the latest image; the staging env vars point to the staging DB).
3. Set the following:

   | Field | Value |
   |---|---|
   | Name | `ssicsim-backend-staging` |
   | Region | Same as production backend |
   | Instance type | Free or Starter |
   | Start Command | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |

4. Under **Environment Variables**, add the same keys as production but with staging values:

   | Key | Value |
   |---|---|
   | `ENVIRONMENT` | `staging` |
   | `DATABASE_URL` | Supabase staging connection string (from Step 1) |
   | `REDIS_URL` | You can reuse the same Render Redis or create a second one |
   | `API_CORS_ORIGINS` | `https://*.vercel.app` (wildcard covers all Vercel preview URLs) |
   | `ADMIN_API_TOKEN` | Generate a separate token: `openssl rand -hex 32` |
   | `GMAIL_USER` | Your Gmail address |
   | `GMAIL_APP_PASSWORD` | Gmail App Password |

5. Click **Create Web Service** and copy the service URL (e.g. `https://ssicsim-backend-staging.onrender.com`).

6. Go to the staging service → **Settings → Deploy hook → Generate deploy hook** and copy it. Add it to GitHub repository secrets as `RENDER_STAGING_BACKEND_DEPLOY_HOOK`.

---

### Step 3 — Add staging environment variables in Vercel

This applies to both `ssicsim-admin-portal` (frontend) and `ssicsim.ca` (website).

#### Admin portal

1. In Vercel, open the **ssicsim-admin-portal** project → **Settings → Environment Variables**.
2. Add each variable below. **Set scope to `Preview` only** — do not touch Production values.

   | Key | Preview value |
   |---|---|
   | `BACKEND_BASE_URL` | `https://ssicsim-backend-staging.onrender.com` |
   | `NEXTAUTH_URL` | Leave blank — Vercel automatically sets this to the preview URL |
   | `NEXTAUTH_SECRET` | Same as production (or a separate staging secret) |
   | `GOOGLE_CLIENT_ID` | Same as production |
   | `GOOGLE_CLIENT_SECRET` | Same as production |
   | `ADMIN_EMAIL_ALLOWLIST` | `tech@ssicsim.ca` |
   | `ADMIN_API_TOKEN` | The staging token you generated in Step 2 |

3. Click **Save** for each variable.

#### Website (ssicsim.ca)

1. In Vercel, open the **ssicsim** (website) project → **Settings → Environment Variables**.
2. Add any env vars the site needs (API keys, CMS tokens, etc.) and set scope to **`Preview`** with staging/test values.
3. If the site calls the admin portal backend, set `BACKEND_BASE_URL` to the staging backend URL.

---

### Step 4 — Update Google OAuth to allow preview URLs

Vercel preview URLs follow the pattern `https://ssicsim-admin-portal-<hash>-ssicsim.vercel.app`. Google OAuth requires explicit redirect URIs, so add a wildcard-friendly approach:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials** → your OAuth 2.0 Client.
2. Under **Authorised JavaScript origins**, add:
   ```
   https://ssicsim-admin-portal.vercel.app
   ```
3. Under **Authorised redirect URIs**, add:
   ```
   https://ssicsim-admin-portal.vercel.app/api/auth/callback/google
   ```

> Google does not support wildcard redirect URIs. For individual PR previews with unique URLs, the easiest fix is to use a stable branch-based preview URL (see Step 5) instead of the hash-based one, or disable Google OAuth in staging and use a dev bypass (see below).

#### Dev bypass for staging (optional but recommended)

To avoid Google OAuth friction on every PR, add a staging-only bypass in the NextAuth config:

1. Set a Vercel Preview env var `STAGING_BYPASS_EMAIL=your@email.com`.
2. In `auth.ts`, add a `CredentialsProvider` that is only active when `ENVIRONMENT !== 'production'` — it auto-signs in as the bypass email without a Google redirect.

This lets you open any PR preview link and click straight through without OAuth.

---

### Step 5 — Open a PR and test it

#### Admin portal PR

1. Push your feature branch and open a PR on GitHub.
2. Vercel automatically deploys a preview. The link appears in the PR checks (e.g. `https://ssicsim-admin-portal-git-<branch>-ssicsim.vercel.app`).
3. The preview automatically uses the `Preview` env vars you set in Step 3, which point to the staging backend and staging DB.
4. Open the preview link, log in, and test your changes end-to-end against real (staging) data.
5. If env vars were just updated and not picked up, go to **Vercel → Deployments → Redeploy** (or push a new commit).

#### Website PR

1. Push your branch and open a PR — Vercel deploys a preview automatically.
2. The preview uses the `Preview` env vars you set in Step 3.
3. Verify the page renders correctly, links work, and any API calls hit staging services.

---

### Step 6 — Migrate the staging DB when schema changes

When a PR includes new Alembic migrations, run them against the staging DB before testing:

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[STAGING-REF].supabase.co:5432/postgres" \
  alembic -c backend/alembic.ini upgrade heads
```

You can also automate this in CI — add a `staging-migrate` job to `pr-checks.yml` that runs on every PR push:

```yaml
staging-migrate:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: "3.12"
    - run: pip install -r backend/requirements.txt
    - run: alembic -c backend/alembic.ini upgrade heads
      env:
        DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
```

Add `STAGING_DATABASE_URL` as a GitHub repository secret (the Supabase staging connection string from Step 1).

---

### Step 7 — Control who can see preview links

By default Vercel requires login to view preview deployments (Vercel team members only).

To open a preview link to anyone with the URL (e.g. for client demos or external review):

1. In Vercel → **Project → Settings → Deployment Protection**.
2. Under **Preview Deployments**, choose **Bypass with link** or **Disabled**.
3. Anyone with the URL can now open it without a Vercel account.

To keep previews team-only (recommended for internal tools like the admin portal):

- Leave the default **Vercel Authentication** protection enabled.
- Invite reviewers to the Vercel team: **Dashboard → Settings → Members → Invite**.

---

### Summary — what happens on every PR

```
PR opened / updated on feature branch
  │
  ├─► Vercel                   Auto-deploys preview frontend
  │     └─ Uses Preview env vars → points to staging backend + staging DB
  │
  ├─► GitHub Actions (pr-checks.yml)
  │     ├─ backend-lint
  │     ├─ frontend-lint
  │     ├─ frontend-typecheck
  │     └─ staging-migrate (if added)  → runs alembic against staging DB
  │
  └─► Render staging backend   Always running, always pointing at staging DB
        └─ Redeploy manually if backend code changed
           (or automate via RENDER_STAGING_BACKEND_DEPLOY_HOOK in pr-checks.yml)

PR merged to main → normal production deploy pipeline (Section 6)
```
