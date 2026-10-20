# Operating JackpotTech

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./circuit.db` | PostgreSQL for production; persistent storage is external to the API |
| `APP_ENV` | `development` | `development`, `test`, or `production` |
| `SECRET_KEY` | Development-only value | Shared JWT signing key; random 32+ characters required in production |
| `APP_VERSION` | `0.2.0` | Set to release/commit identifier |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Integer, 1–1440 |
| `CORS_ORIGINS` | localhost and 127.0.0.1 on port 5173 | Exact comma-separated browser origins |
| `VITE_API_URL` | `/api` | Public frontend build-time API prefix |
| `API_PROXY_TARGET` | `http://127.0.0.1:8000` | Local Vite proxy target only |

`backend/.env` is loaded using an absolute path derived from the application location. Shell
variables take precedence. Production startup rejects a development secret or SQLite URL.
Production disables Swagger UI; the OpenAPI schema remains at `/openapi.json`.

Never put a secret in a `VITE_` variable: Vite embeds it into browser JavaScript. Rebuilding
frontend assets is required to change a configured API URL. Same-origin `/api` avoids that
coupling when moving the same artifact between environments.

## Release contract

From `backend/`, with the new release's dependencies and environment:

```bash
uv sync --locked --no-dev
uv run --no-dev alembic upgrade head
uv run --no-dev uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Run the migration once before switching traffic. API startup never creates tables or inserts
seed records. Seed demo inventory separately with `python -m app.cli seed`; it inserts missing
catalog data and never resets existing stock or users. Create/promote an admin explicitly.

`APP_VERSION` identifies the serving release. `/health/live` is dependency-independent;
`/health/ready` opens a database connection and verifies the expected Alembic revision. Use
readiness for traffic admission and liveness for process restart. Do not restart every API
replica just because the database is down.

Use one or more stateless API processes with the **same secret and PostgreSQL database**.
Each process has a pool of 5 connections plus up to 5 overflow connections; size PostgreSQL
connection capacity for the total number of processes/replicas. Secrets and logs must never
be stored in an image or a public endpoint.

## Checkout consistency

A PostgreSQL row lock on the shopper serializes cart mutation and checkout. Product rows are
locked in consistent ID order, totals are recomputed from database prices, and stock/order/cart
changes commit in one transaction. Failed checkout rolls the transaction back. Price and name
snapshots keep historical orders independent of future catalog edits.

The UI supplies an `Idempotency-Key` for an order attempt and keeps the same key/body after a
network failure. The key is unique per shopper. A duplicate key returns the existing order;
its original request wins, even if a later body differs. This is not a payment idempotency
integration. Clients should check order history before abandoning an ambiguous checkout and
starting another with a new key.

Only admins change order status. Valid paths are pending → paid → shipped → delivered, or
pending/paid → cancelled. Payments are simulated. Cancellation locks the order and restores
stock in the same transaction. Repeating cancellation does not restore stock twice.

## Diagnostics

The API emits one JSON event per request to stderr. Fields include `request_id`, method,
path, status, and `duration_ms`. It accepts short safe `X-Request-ID` values or generates its
own and returns them in the response header. Request bodies, credentials, and query strings
are excluded. Unexpected errors return a generic message plus request ID; readiness failures
return generic dependency status rather than connection details.

Keep reverse-proxy/access logs configured to avoid exposing authorization headers or passwords.
Request logs are a starting point; add error aggregation, process metrics, and alerting as exercises.

## Backups and existing data

Use PostgreSQL tooling (`pg_dump`/`pg_restore`) or a managed database backup mechanism. Test
restores on a separate database. Never practice destructive commands on the old project's
Supabase database. See `database/README.md` for schema migration boundaries.

A frontend image rollback and an API image rollback are independent of database recovery.
Prefer additive migrations with backwards-compatible app releases. A destructive downgrade
can destroy data; the migration downgrade functions are provided for isolated testing.
