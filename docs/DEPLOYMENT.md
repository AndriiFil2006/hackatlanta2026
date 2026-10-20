# Learn deployment with JackpotTech

Build each stage yourself. Each stage ends with an observable result, not just configuration
that happens to parse. You can keep the same application throughout.

## 1. Understand the two processes and one database

Run locally, create an account, place an order, restart the API, and verify that the account,
cart, and order persist. Understand which requests originate in the browser versus the server.
The browser cannot reach a future Docker service by its internal hostname.

Run PostgreSQL locally before advancing. SQLite is a convenient first run, but does not
provide the PostgreSQL row locking used to serialize concurrent checkouts.

**Done when:** you can explain the path from browser → `/api` → API → database, and make the
app work with a new PostgreSQL database using migrations and the seed command.

## 2. Build production containers

Create a backend Dockerfile using Python 3.13 and the locked uv dependencies. Create a
frontend Dockerfile with separate build and static-serving stages. Pin an appropriate Node
version, use `npm ci`, and run `npm run build`. The Vite development server is for local work.

Add build-context exclusions so local `.env`, `.venv`, `node_modules`, databases, and test
artifacts never enter your images. Run as a non-root user. Pass API secrets at runtime.

**Done when:** a clean checkout produces runnable images without a source-code bind mount;
changing your local source does not change a running production container.

## 3. Compose and persistence

Write a Compose definition for static frontend/reverse proxy, API, and PostgreSQL. Route
`/api/*` to FastAPI with the prefix intact. Supply credentials using environment configuration,
use internal service DNS for the backend's database URL, and keep PostgreSQL off the public
network. Add readiness checks and a named database volume.

Run `alembic upgrade head` as a separate one-time task before starting a new API release.
Seed explicitly. Do not have every replica run migrations or create admin accounts.

**Done when:** you can destroy/recreate the containers while preserving orders, and a new
empty volume can be initialized reproducibly. A named volume is persistence, not a backup.

## 4. Deploy one server

Provision a Linux VM, install your runtime, configure a domain and HTTPS, and deploy the
images from a registry. Add restart policies and log rotation. Record the exact image versions
running. Store secrets outside Git and images. For this app, Compose on one server is enough
to learn a useful production deployment.

**Done when:** the app is accessible over HTTPS, recovers after reboot, and does not depend
on a development process running on your laptop.

## 5. CI, then CD

Start with pull-request checks: locked dependency installation, frontend lint/build, Python
lint, and API tests against a temporary PostgreSQL service. Add browser tests. Build images
once per revision and tag with an immutable commit identifier.

Next publish images and deploy to staging, run migrations, wait for readiness, and smoke-test
a catalog read plus an authenticated cart/order journey. Promote those same images instead
of rebuilding them. Keep production credentials out of pull-request jobs.

**Done when:** a failing test blocks release, you can identify the running version through a
health response, and you can restore an earlier image. Schema compatibility must be considered
separately: restoring an image does not undo a migration.

## 6. Backups, visibility, and failure drills

Take a database backup, restore it into a separate instance, and point the app there. Simulate
a database outage: liveness should remain 200 while readiness becomes 503. Correlate a failed
browser request with its `X-Request-ID` in the API logs. Add metrics and alerting as a later
exercise rather than assuming request logs will notify you.

**Done when:** you can recover actual data and diagnose an unavailable dependency without
redeploying blindly.

## 7. Kubernetes

Use a local learning cluster first. Translate the proven setup into API/static-server
Deployments, Services, routing, configuration, secrets, requests/limits, and probes. Use the
migration command as a release Job. Run at least two API replicas against one PostgreSQL
service; managed PostgreSQL can stay outside the cluster.

Delete an API pod, roll out an intentionally broken image, and observe readiness and traffic.
Explore PostgreSQL stateful operation only after learning stateless workloads. Multiple pods
on one laptop teach orchestration, not physical high availability.

**Done when:** a pod replacement preserves orders, API replicas share carts and sessions,
and a bad rollout does not take every healthy instance out of service.

## Optional next application feature

Add an order-confirmation email worker backed by a durable queue and a transactional outbox.
That naturally introduces retries, idempotent consumers, worker deployments, and queue health.
There is no need to split the existing API into microservices to justify learning deployment.
