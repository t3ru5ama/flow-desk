from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_opaque_token,
    hash_token,
)
from app.models.membership import Membership, RoleEnum
from app.models.organization import Organization
from app.models.refresh_token import RefreshToken
from app.models.subscription import Subscription, PlanEnum, PLAN_LIMITS
from app.models.user import User
from app.schemas.auth import SignupRequest
from app.services import audit_service


def _issue_refresh_token(db: Session, user_id: str) -> str:
    token = generate_opaque_token()
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days),
        )
    )
    return token


def signup(db: Session, payload: SignupRequest) -> tuple[User, Organization, Membership, str, str]:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    org = Organization(name=payload.organization_name)
    db.add(org)
    db.flush()

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    membership = Membership(organization_id=org.id, user_id=user.id, role=RoleEnum.owner)
    db.add(membership)

    limits = PLAN_LIMITS[PlanEnum.business]
    db.add(Subscription(organization_id=org.id, plan=PlanEnum.business, **limits))

    audit_service.log(db, org.id, user.id, "organization.created", "organization", org.id)
    audit_service.log(db, org.id, user.id, "user.signed_up", "user", user.id)

    access_token = create_access_token(user.id, org.id, membership.role.value)
    refresh_token = _issue_refresh_token(db, user.id)
    db.commit()
    return user, org, membership, access_token, refresh_token


def login(db: Session, email: str, password: str) -> tuple[User, Organization, Membership, str, str]:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    membership = db.query(Membership).filter(Membership.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    org = db.get(Organization, membership.organization_id)

    access_token = create_access_token(user.id, org.id, membership.role.value)
    refresh_token = _issue_refresh_token(db, user.id)
    db.commit()
    return user, org, membership, access_token, refresh_token


def refresh(db: Session, refresh_token: str) -> str:
    token_hash = hash_token(refresh_token)
    entry = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if (
        not entry
        or entry.revoked
        or entry.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.get(User, entry.user_id)
    membership = db.query(Membership).filter(Membership.user_id == user.id).first()
    return create_access_token(user.id, membership.organization_id, membership.role.value)


def logout(db: Session, refresh_token: str | None) -> None:
    if not refresh_token:
        return
    token_hash = hash_token(refresh_token)
    entry = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if entry:
        entry.revoked = True
        db.commit()


def forgot_password(db: Session, email: str) -> str | None:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user:
        return None
    token = generate_opaque_token()
    user.reset_token_hash = hash_token(token)
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()
    return token


def reset_password(db: Session, token: str, new_password: str) -> None:
    token_hash = hash_token(token)
    user = db.query(User).filter(User.reset_token_hash == token_hash).first()
    if (
        not user
        or not user.reset_token_expires_at
        or user.reset_token_expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user.password_hash = hash_password(new_password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    db.commit()
