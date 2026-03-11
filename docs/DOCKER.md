# Docker Compose

## Start

`docker-compose up --build`

## Services

- `frontend` (Next.js): `http://localhost:3000`
- `backend` (FastAPI): `http://localhost:8000`
- `db` (Postgres): `localhost:5432`
- `redis` (Redis): `localhost:6379`
- `worker` (RQ): consumes jobs from Redis

## Migrations

The `backend` service runs:

- `alembic -c alembic.ini upgrade head`

To create new migrations (run on host):

- `cd backend`
- `alembic -c alembic.ini revision -m "your message" --autogenerate`

