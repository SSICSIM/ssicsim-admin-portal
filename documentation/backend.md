# Backend Overview & Navigation

## Navigation (what’s where)
- `backend/app/main.py` — FastAPI app factory; mounts API routers and serves `/uploads` for local files.
- `backend/app/api/` — Route handlers (committees, delegates, assignments, etc.).
- `backend/app/models/` — SQLAlchemy models (DB schema).
- `backend/app/schemas.py` — Pydantic request/response models.
- `backend/app/utilities/storage.py` — Image upload helper: Supabase first, local fallback.
- `backend/app/config.py` — Settings loaded from `.env`.
- `backend/migrations/` — Alembic migration scripts.
- `backend/tests/` — Pytest suite (SQLite in-memory, temp uploads).
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
```
cd backend
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 pytest -q
```
Uses SQLite in-memory + temp uploads; disabling auto-loaded plugins avoids global interference.

## Migrations
```
cd backend
alembic revision --autogenerate -m "message"
alembic upgrade head
```
Ensure the DB `alembic_version` matches the baseline in `migrations/versions`.
