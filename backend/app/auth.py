from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import User

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except (ValueError, TypeError):
        return False


# Equalize password work for nonexistent accounts as well as wrong passwords.
DUMMY_HASH = bcrypt.hashpw(b"not-a-real-account-password", bcrypt.gensalt()).decode()


def create_access_token(user: User, settings) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user.user_id),
            "iat": now,
            "exp": now + timedelta(minutes=settings.token_minutes),
            "iss": "circuit-market",
        },
        settings.secret_key,
        algorithm="HS256",
    )


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    error = HTTPException(
        401,
        "Your session has expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise error
    try:
        payload = jwt.decode(
            credentials.credentials,
            request.app.state.settings.secret_key,
            algorithms=["HS256"],
            issuer="circuit-market",
            options={"require_exp": True, "require_sub": True},
        )
        user_id = int(payload["sub"])
    except (JWTError, ValueError, KeyError, TypeError):
        raise error from None
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user:
        raise error
    return user


def get_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Administrator access required")
    return user
