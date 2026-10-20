"""Validated configuration. No database connections or writes happen on import."""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    environment: str
    version: str
    cors_origins: list[str]
    token_minutes: int

    @classmethod
    def from_env(cls):
        environment = os.getenv("APP_ENV", "development")
        if environment not in {"development", "test", "production"}:
            raise ValueError("APP_ENV must be development, test, or production")
        secret = os.getenv("SECRET_KEY", "development-only-secret-change-before-deploying")
        if environment == "production" and (
            len(secret) < 32 or secret.startswith(("development-", "your-", "change-"))
        ):
            raise ValueError("Production requires a random SECRET_KEY of at least 32 characters")
        database_url = os.getenv("DATABASE_URL", "sqlite:///./circuit.db")
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if environment == "production" and not database_url.startswith("postgresql+psycopg://"):
            raise ValueError("Production requires a PostgreSQL DATABASE_URL")
        minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
        if minutes < 1 or minutes > 1440:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be between 1 and 1440")
        return cls(
            database_url=database_url,
            secret_key=secret,
            environment=environment,
            version=os.getenv("APP_VERSION", "0.2.0"),
            cors_origins=[
                origin.strip()
                for origin in os.getenv(
                    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
                ).split(",")
                if origin.strip()
            ],
            token_minutes=minutes,
        )
