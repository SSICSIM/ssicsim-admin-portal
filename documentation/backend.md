# Backend Overview & Navigation

## Navigation (what’s where)
- `backend/app/main.py` — FastAPI app factory; mounts API routers and serves `/uploads` for local files.
- `backend/app/api/` — Route handlers (committees, delegates, assignments, etc.).
- `backend/app/models/` — SQLAlchemy models (DB schema).
- `backend/app/schemas.py` — Pydantic request/response models.
- `backend/app/utilities/storage.py` — Image upload helper: Supabase first, local fallback.
- `backend/app/config.py` — Settings loaded from `.env`.
- `backend/migrations/` — Alembic migration scripts.
- `backend/tests/` — Pytest suite (dedicated Postgres test DB, temp uploads; see **Tests**).
- `documentation/backend.md` — This guide.

## Stack
- FastAPI, SQLAlchemy 2.x, Alembic
- PostgreSQL (dev/prod), SQLite (tests)
- Supabase Storage with local fallback for committee images

## Environment (.env) example
Place in `backend/.env`:
```
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/ssicsim
REDIS_URL=redis://localhost:6379/0
API_CORS_ORIGINS=http://localhost:3000

# Supabase Storage (optional; if unset, local upload fallback is used)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=ssicsim-assets
SUPABASE_PUBLIC_BASE_URL=https://cdn.yourdomain.com  # optional CDN/custom domain

# Local upload fallback
UPLOAD_DIR=uploads
UPLOAD_BASE_URL=/uploads
```

## Running the backend
```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
OpenAPI docs: http://localhost:8000/docs

## Uploading committee images
- Endpoint: `POST /api/committees/{committee_id}/image`
- Body: multipart/form-data with `file` (image).
- Behavior:
  - If Supabase env vars are configured, uploads go to Supabase; `image_url` stores the public URL.
  - Otherwise, files are saved to `UPLOAD_DIR` and served from `UPLOAD_BASE_URL` (default `/uploads`). The static mount in `main.py` stays in place even when Supabase is enabled—it just isn’t used.

## Tests
Tests run against a **real Postgres database**, not SQLite — `tests/conftest.py` requires an explicit `TEST_DATABASE_URL` pointing at a dedicated test database, and its fixture **drops every table on teardown**. It refuses to run if the database name doesn't contain `test`, and does *not* fall back to your real `DATABASE_URL` — never point it at your dev/prod database.

One-time setup (only needed once per environment):
```
docker compose exec db psql -U postgres -c "CREATE DATABASE ssicsim_test;"
```
Run tests (from `backend/`, on the host — same `localhost:5432` reasoning as Alembic above). The backend needs **Python 3.11+** (it uses `datetime.UTC`):
```
cd backend
pip install -r requirements-dev.txt   # includes pytest + httpx
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 TEST_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/ssicsim_test pytest -q
```
Disabling auto-loaded plugins avoids global interference. Uploads go to a temp dir per test run.

No Python 3.11+ on your machine? Run the suite entirely in Docker against a throwaway Postgres (nothing touches your dev DB):
```
docker network create ssicsim-test
docker run -d --rm --name ssicsim-test-db --network ssicsim-test \
  -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=ssicsim_test postgres:16
docker run --rm --network ssicsim-test -v "$PWD/backend":/app -w /app \
  -e TEST_DATABASE_URL=postgresql+psycopg2://postgres:pw@ssicsim-test-db:5432/ssicsim_test \
  python:3.12-slim sh -c "pip install -q -r requirements-dev.txt && pytest -q"
docker stop ssicsim-test-db && docker network rm ssicsim-test
```

`tests/test_google_sheets.py` swaps the real worksheet for an in-memory fake, so it never calls Google and needs no credentials.

**Frontend unit tests** (`frontend/utils/*.test.ts`, Node's built-in test runner — needs Node 22.18+):
```
cd frontend
npm test
```

## Migrations
The repo-root `.env` sets `DATABASE_URL` to `postgresql+psycopg2://postgres:postgres@db:5432/ssicsim` — `db` is the Postgres service name in `docker-compose.yml` and only resolves inside the Docker network. Because of this, run Alembic **inside the backend container**, not from your host shell:
```
docker compose exec backend alembic revision --autogenerate -m "message"
docker compose exec backend alembic upgrade heads
```

Ensure the DB `alembic_version` matches the baseline in `migrations/versions`.

### Multiple heads
If two branches/PRs each add a migration on top of the same parent revision, Alembic ends up with two heads and `revision --autogenerate` fails with:
```
Multiple heads are present; please specify the head revision on which the new revision should be based, or perform a merge.
```
Check the heads with:
```
docker compose exec backend alembic heads -v
```
Resolve it by creating a merge revision, then apply it before generating anything new:
```
docker compose exec backend alembic merge heads -m "merge_heads"
docker compose exec backend alembic upgrade heads
```
After that, `alembic revision --autogenerate` will build on top of the merge point as normal.

### Sanity-checking a migration
After autogenerating and applying, confirm there's no remaining drift between the models and the DB:
```
docker compose exec backend alembic check
```
`No new upgrade operations detected.` means the migration fully captures the model changes.

