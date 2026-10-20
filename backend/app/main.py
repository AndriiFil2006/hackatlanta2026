import json
import logging
import re
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .config import Settings
from .db import make_engine, session_factory
from .routes import accounts, admin, catalog, commerce

logger = logging.getLogger("circuit")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app):
        # Schema changes are an explicit release step, never a per-replica startup action.
        yield
        engine.dispose()

    app = FastAPI(
        title="JackpotTech API",
        version=settings.version,
        lifespan=lifespan,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.sessions = session_factory(engine)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def log_request(request: Request, call_next):
        supplied = request.headers.get("X-Request-ID", "")
        request_id = (
            supplied if re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", supplied) else uuid.uuid4().hex
        )
        request.state.request_id = request_id
        started = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            # Never log tokens, passwords, bodies, connection strings, or raw DB exceptions.
            logger.error(json.dumps({"event": "unhandled_error", "request_id": request_id}))
            response = JSONResponse(
                status_code=500,
                content={
                    "detail": "Something went wrong. Please try again.",
                    "request_id": request_id,
                },
            )
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if "authorization" in request.headers or request.url.path.startswith("/api/auth"):
            response.headers["Cache-Control"] = "no-store"
        logger.info(
            json.dumps(
                {
                    "event": "http_request",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": round((time.monotonic() - started) * 1000, 2),
                }
            )
        )
        return response

    @app.get("/health/live", tags=["Operations"])
    def live():
        return {"status": "ok", "version": settings.version}

    @app.get("/health/ready", tags=["Operations"])
    def ready():
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                revision = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
                if revision != "0003":
                    raise HTTPException(503, "Database migrations are pending")
        except SQLAlchemyError:
            raise HTTPException(503, "Database is not ready") from None
        return {"status": "ready", "version": settings.version}

    for router in (accounts.router, catalog.router, commerce.router, admin.router):
        app.include_router(router, prefix="/api")
    return app


app = create_app()
