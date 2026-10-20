# JackpotTech

A complete demo electronics marketplace, built as a starting point for learning deployment.
React + Vite frontend, FastAPI backend, SQLAlchemy, Alembic, and PostgreSQL. SQLite is available
for a quick local start. The catalog uses real hardware models, manufacturer specification links, and locally stored product photos. Prices and stock are illustrative.
There are no payment providers, cloud accounts, or paid API keys to configure.

## Start locally

Requirements: Python **3.13+**, [uv](https://docs.astral.sh/uv/), Node **22.12+** (Node 20.19+
also works), and npm. Start the two processes in separate terminals.

Backend, from the repository root:

```bash
cd backend
uv sync --locked
# Use a new local database even if an old backend/.env still points to Supabase.
export DATABASE_URL=sqlite:///./circuit.db
uv run alembic upgrade head
uv run python -m app.cli seed
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm ci
# Override a previous frontend/.env API address, if present.
VITE_API_URL=/api npm run dev
```

Open **http://localhost:5173**. Create an account in the UI (password: at least 10 characters).
Use fictional shipping details. `WELCOME10` takes 10% off the subtotal; shipping is $8 below
$150 and free at $150+. No payment is collected and nothing is shipped.

On PowerShell, set environment variables with `$env:DATABASE_URL = 'sqlite:///./circuit.db'`
and `$env:VITE_API_URL = '/api'` before the respective commands.

### Administration

From `backend/`, with the same database configuration:

```bash
uv run python -m app.cli create-admin you@example.com
```

This promotes an existing account, or prompts for a password to create a new admin. Sign in
and use **Manage store** to create/edit products, adjust stock, publish/hide listings, create
categories, and process all customers' orders. No default admin credentials are shipped.

### PostgreSQL

Create a dedicated database and role using your local PostgreSQL installation or a managed
PostgreSQL instance. Set the connection string in `backend/.env` or your shell:

```bash
export DATABASE_URL='postgresql+psycopg://circuit:password@127.0.0.1:5432/circuit'
uv run alembic upgrade head
uv run python -m app.cli seed
```

`backend/.env.example` documents configuration. A plain `postgresql://` URL is also normalized
to the installed psycopg driver. Local environment variables take precedence over `.env`.
The root `.env` from the old Compose setup is no longer used.

**Use an empty database for the new app.** The rebuild does not alter your existing database,
local `.env` files, or account credentials. Old schemas differ from the new Alembic baseline;
do not run migrations or `stamp` against them without comparing schemas and taking a backup.
See [database notes](database/README.md).

## What works

- Search, category filtering, sorting, pagination, and in-stock filtering.
- Account registration/login, expiring JWT sessions, and per-user authorization.
- Persistent carts, validated quantities, stock checks, and server-calculated totals.
- Discount codes, order snapshots, order history, and retry-safe checkout.
- Customer reviews and aggregate ratings, with one review per account/product.
- Clearly labeled fictional demo reviews, excluded from customer ratings.
- Admin inventory, categories, order fulfillment, and cancellation with stock restoration.
- Responsive layouts, keyboard-accessible native dialogs, loading/error/empty states.

The frontend uses `/api` by default. Vite proxies that prefix to the backend without rewriting
it. Production hosting must route `/api/*` to FastAPI and serve the frontend's `dist/` files.
For separate API hosting, `VITE_API_URL=https://api.example.com/api` is a **public build-time**
setting; the API origin must be allowed in backend CORS configuration.

## Checks

```bash
cd backend
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

Default API tests use temporary SQLite databases created through real migrations. To run the
same tests, including concurrent checkout tests, against PostgreSQL:

```bash
TEST_DATABASE_URL='postgresql+psycopg://circuit:password@localhost:5432/circuit_test' uv run pytest
```

Use a dedicated test database. Each test creates and drops its own randomly named schema;
the test role needs schema creation permission. Tests never use your application's `DATABASE_URL`.

```bash
cd frontend
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests start their own API and Vite processes on ports **18000** and **15173**, use a
fresh temporary database, and verify shopping, administration, errors, and mobile layout.
Screenshots and traces are saved in the ignored `frontend/test-results/` directory on failure.

## Project map

```text
backend/
  app/config.py           Environment validation
  app/models.py           Database entities
  app/schemas.py          API contracts and validation
  app/routes/             Accounts, catalog, shopping, admin
  app/services.py         Pricing and transaction helpers
  app/main.py             App factory, health checks, request logging
  app/cli.py              Repeatable seed and explicit admin provisioning
  migrations/             Version-controlled schema changes
  tests/                  API, database, concurrency tests
frontend/
  src/App.jsx             Storefront and application state
  src/components/         Product cards, dialogs, admin screens
  src/api.js              HTTP client and session handling
  public/products/        Local hardware photos and image provenance
  e2e/                    Browser-level user journeys
```

## Deployment is your next project

The outdated Dockerfiles, Compose file, and conflicting SQL setup scripts have been removed.
Container definitions, CI/CD workflows, and Kubernetes manifests are intentionally left for
you to implement. The app already supplies the contracts those tools need:

- `GET /health/live`: process is alive, without requiring the database.
- `GET /health/ready`: database is reachable and at the expected migration revision (503 otherwise).
- `APP_VERSION`: appears in health responses for release verification.
- JSON request logs to stderr with duration, response status, and `X-Request-ID`.
- Migrations run once as a release step; application replicas never change the schema on startup.
- PostgreSQL transactions/row locks protect checkout across replicas; idempotency keys protect retries.

Start with [the deployment learning path](docs/DEPLOYMENT.md). API behavior and operating
procedures are documented in [docs/API.md](docs/API.md) and [docs/OPERATIONS.md](docs/OPERATIONS.md).

To update an existing installation with the real-hardware catalog, stop the backend, then run
from `backend/` using the same database configuration:

```bash
uv run alembic upgrade head
uv run python -m app.cli seed
```

Restart the backend afterward. The seed command hides known fictional demo listings and inserts
missing real-hardware listings plus labeled sample reviews. It preserves accounts, existing orders,
custom products, and stock values on existing real-hardware products. Old carts may contain hidden
fictional listings; remove those items before checkout. Historical order snapshots keep their names.

Product photos and their sources are listed in
[image provenance](frontend/public/products/hardware/SOURCES.md).

This is an educational foundation. Payments are simulated, tokens are tab-scoped in
`sessionStorage`, and email verification, password reset, distributed rate limiting, and
production abuse prevention are not implemented. Use test accounts/data until you add those
controls for a public store.
