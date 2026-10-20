"""Disposable server used only by Playwright. Never reads the developer database."""

import os
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))


def main():
    with tempfile.TemporaryDirectory(prefix="circuit-browser-") as temporary:
        os.environ["DATABASE_URL"] = f"sqlite:///{Path(temporary) / 'e2e.db'}"
        os.environ["APP_ENV"] = "test"
        os.environ["SECRET_KEY"] = "browser-test-only-secret-not-for-any-real-deployment"
        import uvicorn
        from alembic import command
        from alembic.config import Config

        from app.auth import hash_password
        from app.cli import seed
        from app.main import app
        from app.models import User

        config = Config(str(BACKEND / "alembic.ini"))
        command.upgrade(config, "head")
        with app.state.sessions() as db:
            seed(db)
            db.add(
                User(
                    email="admin@example.com",
                    display_name="Test Admin",
                    is_admin=True,
                    password_hash=hash_password("browser-test-password"),
                )
            )
            db.commit()
        uvicorn.run(app, host="127.0.0.1", port=18000, log_level="warning")


if __name__ == "__main__":
    main()
