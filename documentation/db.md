# Database and Alembic Notes

This backend uses SQLAlchemy models with Alembic migrations to manage the Postgres schema.

## ORM mapping basics

- Each SQLAlchemy model class maps to a database table.
- Each class attribute with `mapped_column(...)` maps to a table column.
- `__tablename__` defines the table name.
- `db.get(Model, id)` fetches a row by primary key and returns the model instance.

## What `Base.metadata` contains

`Base.metadata` is SQLAlchemy's registry of all table definitions discovered from your models. It includes:

- Table names, columns, types, and constraints.
- Foreign keys, indexes, and relationships.
- Everything Alembic needs to compare models vs the database.

## What Alembic provides

Alembic is the migration tool that:

- Generates migration scripts from `Base.metadata` (`--autogenerate`).
- Tracks applied revisions in the `alembic_version` table.
- Applies schema changes in order with `alembic upgrade`.

## How models are loaded

- Models live in `backend/app/models/`.
- Alembic imports them in `backend/migrations/env.py` via `from app import models`.
- This populates `Base.metadata`, which Alembic uses for autogenerate.

## Migration flow

1. Update or add SQLAlchemy models in `backend/app/models/`.
2. Generate a revision:

```
alembic revision --autogenerate -m "describe change"
```

3. Review and adjust the migration in `backend/migrations/versions/`.
4. Apply it:

```
alembic upgrade head
```

## How Alembic decides what is new

- Each migration has a `revision` and `down_revision`.
- The current DB revision is stored in the `alembic_version` table.
- `alembic upgrade head` applies all revisions after the stored version.

## Common checks

List tables:

```
docker compose exec db psql -U postgres -d ssicsim -c "\\dt"
```

Current Alembic revision:

```
docker compose exec db psql -U postgres -d ssicsim -c "select * from alembic_version;"
```

## Notes about autogenerate

- Autogenerate compares models to the current DB schema.
- It does not recreate tables that already exist in the DB.
- For enum types or data migrations, manual edits are often required.
