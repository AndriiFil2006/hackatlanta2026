# Database setup

Alembic in `backend/migrations/` is the only schema source of truth. The old hand-maintained
`schema.sql` and `seed.sql` were removed because they disagreed with the ORM and contained
broken/mixed-purpose seed statements. Demo data now lives in the repeatable `app.cli seed`
command. It is not run automatically during startup or migration.

Create a **new empty database** for JackpotTech, then run from `backend/`:

```bash
uv run alembic upgrade head
uv run python -m app.cli seed
```

Your existing database was not connected to or modified during the rebuild. Local `.env`
files have been preserved. Existing accounts using bcrypt hashes can potentially be migrated,
but the old schema has inconsistent constraints/defaults across SQL-created and ORM-created
installations. There is no automatic in-place data conversion in this rebuild.

To retain old data, first back it up and restore a copy into an isolated instance. Compare its
schema with migration `0001`, reconcile constraints and nullability, and test a data migration
there before adopting a baseline. Do not blindly `stamp head`: that marks migrations applied
without creating the new order columns or constraints.

For future schema changes, update the models and generate a revision:

```bash
uv run alembic revision --autogenerate -m "describe the change"
# Review the generated migration, especially existing rows and destructive operations.
uv run alembic upgrade head
uv run alembic check
```

Migration `0001` freezes the marketplace schema. `0002` adds order idempotency and pricing
breakdown columns, including an existing-order backfill. API readiness checks for `0003`.
`0003` adds manufacturer URLs and explicit demo-review flags.
When adding a future revision, update that expected revision as part of the app release.
