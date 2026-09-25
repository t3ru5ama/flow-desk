from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dev_mail import record as record_dev_mail
from app.core.rate_limit import limiter
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.schemas.auth import (
    AccessTokenOnly,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE, token, httponly=True, secure=settings.env != "development",
        samesite="strict", max_age=settings.jwt_refresh_expire_days * 86400,
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def signup(request: Request, payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    user, org, membership, access_token, refresh_token = auth_service.signup(db, payload)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token, user=user, organization=org)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user, org, membership, access_token, refresh_token = auth_service.login(db, payload.email, payload.password)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token, user=user, organization=org)


@router.post("/refresh", response_model=AccessTokenOnly)
def refresh(refresh_token: str | None = Cookie(None, alias=REFRESH_COOKIE), db: Session = Depends(get_db)):
    if not refresh_token:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    access_token = auth_service.refresh(db, refresh_token)
    return AccessTokenOnly(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(None, alias=REFRESH_COOKIE),
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
):
    auth_service.logout(db, refresh_token)
    response.delete_cookie(REFRESH_COOKIE)


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    token = auth_service.forgot_password(db, payload.email)
    if token:
        link = f"{settings.app_url}/reset-password?token={token}"
        record_dev_mail(payload.email, "Reset your FlowDesk password", link)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_service.reset_password(db, payload.token, payload.password)
