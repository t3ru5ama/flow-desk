from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current: CurrentUser = Depends(get_current_user)):
    return current.user


@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.get(User, current.id)
    if payload.name is not None:
        user.name = payload.name
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    db.commit()
    return user
