# SSICSIM Admin Portal

Web-based administrative dashboard for managing committee data, delegate assignment, and operational tools for the SSICSIM conference.

## Tech Stack (Target)

| Component | Technology | Docker? |
|---|---|---|
| Frontend | Next.js + TypeScript + Zustand + TanStack Query | Yes |
| API Server | FastAPI + Pydantic + Alembic + SQLAlchemy | Yes |
| Worker | Python worker (RQ) | Yes |
| Queue | Redis | Yes (local) |
| Database | PostgreSQL | Yes (local) |

## Project Structure

```
ssicsim-admin-portal/
├── frontend/                  # Next.js React application
├── backend/                   # FastAPI application + migrations + worker entrypoint
├── docs/                      # Documentation
└── docker-compose.yml         # Multi-container local dev setup
```

## Quickstart (Docker)

1. `cp .env.example .env`
2. `docker-compose up --build`

URLs:
- Frontend: `http://localhost:3000`
- API health: `http://localhost:8000/api/health`
- Swagger (OpenAPI): `http://localhost:8000/docs`

Notes:
- `docker-compose` runs `alembic upgrade head` automatically on API startup.

## Documentation

- `docs/DOCKER.md`
- `backend/db.md`
