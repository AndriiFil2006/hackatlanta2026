from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import schemas as s
from ..auth import (
    DUMMY_HASH,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..db import get_db
from ..models import Cart, User

router = APIRouter(tags=["Accounts"])


@router.post("/auth/register", response_model=s.TokenResponse, status_code=201)
def register(data: s.UserRegister, request: Request, db: Session = Depends(get_db)):
    user = User(
        email=str(data.email).lower(),
        display_name=data.display_name,
        password_hash=hash_password(data.password),
    )
    try:
        db.add(user)
        db.flush()
        db.add(Cart(user_id=user.user_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with that email already exists") from None
    return s.TokenResponse(access_token=create_access_token(user, request.app.state.settings))


@router.post("/auth/login", response_model=s.TokenResponse)
def login(data: s.UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    valid = verify_password(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, "Email or password is incorrect")
    return s.TokenResponse(access_token=create_access_token(user, request.app.state.settings))


@router.get("/users/me", response_model=s.UserResponse)
def profile(user: User = Depends(get_current_user)):
    return user
