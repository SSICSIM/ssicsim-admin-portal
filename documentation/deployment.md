# Deployment Guide

Step-by-step instructions for deploying the SSICSIM admin portal to production (Supabase + Render + Vercel).

---

## 1. Supabase — database + storage

### Database

1. Create a new project at [supabase.com](https://supabase.com). Note the database password.
2. Go to **Settings → Database → Connection string → URI** and copy the **Direct connection** string:
   ```
   postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
   ```
3. From your local machine, run this command from inside the `backend/` directory — it creates all the tables in Supabase by applying every Alembic migration in order:
   Temporarily set `DATABASE_URL` in `backend/.env` to the Supabase connection string (note the `+psycopg2` driver):
   ```
   DATABASE_URL=postgresql+psycopg2://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
   ```
   Then run from inside `backend/`:
   ```bash
   cd backend && alembic upgrade heads
   ```
   After migrations succeed, swap `DATABASE_URL` back to the local Docker value in `.env`.
   Replace `[PASSWORD]` and `[REF]` with the values from step 2. You only need to run this once on first setup. Future schema changes (new columns, new tables) are applied automatically when you publish a GitHub Release.

   You can verify the tables were created by going to **Supabase → Table Editor** — you should see `committees`, `delegates`, `delegations`, `characters`, `assignments`, etc.

### Storage (committee images)

1. In your Supabase project go to **Storage → New bucket**.
2. Name it `ssicsim-assets`, toggle **Public bucket on**, click **Create**.
3. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Render — backend + worker + Redis

### Redis

1. **New → Redis** → name it `ssicsim-redis` → create.
2. Copy the **Internal URL** (e.g. `redis://red-xxx:6379`) → this is `REDIS_URL`.

### Generate the admin token

Run this once and save the output — you'll need it in both Render and Vercel:
```bash
openssl rand -hex 32
```

### Backend service

1. **New → Web Service** → connect your GitHub repo → set **Root Directory** to `/` (uses `backend/Dockerfile`).
2. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
3. Set **Pre-Deploy Command**: `alembic upgrade heads`
4. Add environment variables:

   | Key | Value |
   |---|---|
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | Supabase direct connection string |
   | `REDIS_URL` | Render Redis internal URL |
   | `API_CORS_ORIGINS` | `https://admin.ssicsim.ca` |
   | `ADMIN_API_TOKEN` | Token from step above |
   | `FRONTEND_URL` | `https://admin.ssicsim.ca` |
   | `GMAIL_USER` | Your Gmail address |
   | `GMAIL_APP_PASSWORD` | Gmail App Password ([generate here](https://myaccount.google.com/apppasswords)) |
   | `SUPABASE_URL` | From Supabase Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Settings → API |
   | `SUPABASE_BUCKET` | `ssicsim-assets` |

5. Click **Create Web Service**.

### Worker service

1. **New → Background Worker** → same GitHub repo.
2. Set **Start Command**: `python -m app.worker`
3. Add the same environment variables as the backend (you can skip `API_CORS_ORIGINS`).
4. Click **Create Background Worker**.

### Deploy hooks (for CI/CD)

For each service → **Settings → Deploy hook → Generate** → copy the URL.

Then add all three secrets to GitHub:

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**.
2. Add each of the following:

   | Secret name | Value |
   |---|---|
   | `RENDER_BACKEND_DEPLOY_HOOK` | Deploy hook URL from `ssicsim-backend` service |
   | `RENDER_WORKER_DEPLOY_HOOK` | Deploy hook URL from `ssicsim-worker` service |
   | `PRODUCTION_DATABASE_URL` | Supabase direct connection string (same one used for migrations) |

Once these are set, publishing a GitHub Release automatically runs migrations then redeploys both Render services via `deploy.yml`.

---

## 3. Vercel — frontend

1. **Add New → Project** → import `SSICSIM/ssicsim-admin-portal`.
2. Set **Root Directory** to `frontend/`.
3. Framework preset: **Next.js** (auto-detected).
4. Add environment variables (scope: **Production**):

   | Key | Value |
   |---|---|
   | `BACKEND_BASE_URL` | Your Render backend URL e.g. `https://ssicsim-backend.onrender.com` |
   | `NEXTAUTH_URL` | `https://admin.ssicsim.ca` |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
   | `GOOGLE_CLIENT_ID` | From Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
   | `ADMIN_EMAIL_ALLOWLIST` | `tech@ssicsim.ca` |
   | `ADMIN_API_TOKEN` | **Same token as Render** — must match exactly |

   > `ADMIN_API_TOKEN` must NOT be prefixed with `NEXT_PUBLIC_` — it must stay server-side only.

5. Click **Deploy**.

### Google OAuth redirect URIs

In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials** → your OAuth client:
- Authorised JavaScript origins: `https://admin.ssicsim.ca`
- Authorised redirect URIs: `https://admin.ssicsim.ca/api/auth/callback/google`

---

## 4. Custom domain (GoDaddy → Vercel)

1. In Vercel → **Project → Settings → Domains** → **Add Domain** → enter `admin.ssicsim.ca`.
2. Vercel shows a CNAME record to add. In GoDaddy → **My Products → DNS** → **Add New Record**:

   | Type | Name | Value | TTL |
   |---|---|---|---|
   | `CNAME` | `admin` | `cname.vercel-dns.com` | 600 |

3. Back in Vercel click **Verify** (DNS propagation takes 5–30 minutes).
4. Vercel provisions SSL automatically.

---

## 5. Security checklist

Before going live confirm all of the following:

- [ ] `ADMIN_API_TOKEN` is set on both Render and Vercel with the **same value**
- [ ] `NEXTAUTH_SECRET` is a randomly generated value (`openssl rand -base64 32`)
- [ ] `ADMIN_EMAIL_ALLOWLIST` contains only trusted email addresses
- [ ] `API_CORS_ORIGINS` on Render is set to `https://admin.ssicsim.ca` (not `*`)
- [ ] `GOOGLE_CLIENT_SECRET` is not committed to the repo
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not committed to the repo
- [ ] Google OAuth redirect URIs are set to the production domain only

### How the token works

Every API request goes through two gates:
1. **Google OAuth** — only allowlisted emails can sign in; unauthenticated users never reach the backend
2. **X-Admin-Token header** — the Next.js server injects `ADMIN_API_TOKEN` into every backend request; FastAPI rejects anything without the correct token

If the token ever leaks: generate a new one, update it on Render first, then Vercel, and redeploy both.

---

## 6. GitHub secrets required

| Secret | Used by |
|---|---|
| `RENDER_BACKEND_DEPLOY_HOOK` | `deploy.yml` |
| `RENDER_WORKER_DEPLOY_HOOK` | `deploy.yml` |
| `PRODUCTION_DATABASE_URL` | `deploy.yml` (migration step) |

---

## 7. How to deploy a release

1. Merge all PRs for the milestone into `main`.
2. On GitHub → **Releases → Draft a new release** → choose a tag (e.g. `v1.0.0`) → **Publish release**.
3. This triggers `deploy.yml` which runs migrations then fires the Render deploy hooks.
4. Vercel deploys the frontend automatically on every push to `main`.

### Rolling back

```bash
# Render — go to: Service → Deploys → select a previous deploy → Rollback

# Database rollback (run from inside backend/)
cd backend && DATABASE_URL="postgresql://..." alembic downgrade -1
```

---

## 8. Adding committee data

1. Open your Supabase project → **Table Editor → committees**.
2. Click **Insert → Insert row** and fill in the fields. Only `name` and `director_name` are required.
3. Click **Save** — the row is live immediately.

For bulk edits use the **SQL Editor**:
```sql
UPDATE committees
SET background_guide_link = 'https://...'
WHERE name = 'UNSC';
```
