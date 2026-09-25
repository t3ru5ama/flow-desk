from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, generate_opaque_token, hash_token
from app.models.invite import Invite
from app.models.membership import Membership, RoleEnum
from app.models.organization import Organization
from app.models.user import User
from app.services import audit_service, notification_service
from app.models.notification import NotificationType

INVITE_EXPIRE_HOURS = 24


def create_invite(db: Session, org_id: str, inviter_id: str, email: str, role: RoleEnum) -> tuple[Invite, str]:
    if role == RoleEnum.owner:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cannot invite as owner")

    existing_user = db.query(User).filter(User.email == email.lower()).first()
    if existing_user:
        existing_membership = (
            db.query(Membership)
            .filter(Membership.organization_id == org_id, Membership.user_id == existing_user.id)
            .first()
        )
        if existing_membership:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member")

    token = generate_opaque_token()
    invite = Invite(
        organization_id=org_id,
        email=email.lower(),
        role=role,
        token_hash=hash_token(token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=INVITE_EXPIRE_HOURS),
        invited_by=inviter_id,
    )
    db.add(invite)
    db.flush()
    audit_service.log(db, org_id, inviter_id, "invite.created", "invite", invite.id, {"email": email})
    db.commit()
    return invite, token


def accept_invite(db: Session, token: str, name: str | None, password: str | None) -> tuple[User, Membership]:
    token_hash = hash_token(token)
    invite = db.query(Invite).filter(Invite.token_hash == token_hash).first()
    if (
        not invite
        or invite.accepted_at is not None
        or invite.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired invite")

    user = db.query(User).filter(User.email == invite.email).first()
    if not user:
        if not name or not password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="name and password are required for a new account",
            )
        user = User(name=name, email=invite.email, password_hash=hash_password(password))
        db.add(user)
        db.flush()

    membership = Membership(organization_id=invite.organization_id, user_id=user.id, role=invite.role)
    db.add(membership)
    invite.accepted_at = datetime.now(timezone.utc)

    notification_service.create(
        db, user.id, invite.organization_id, NotificationType.team_invited,
        "Welcome to the team", "Your invite has been accepted.",
    )
    audit_service.log(db, invite.organization_id, user.id, "membership.created", "membership", membership.id)
    db.commit()
    return user, membership


def change_role(db: Session, org_id: str, actor_id: str, target_user_id: str, role: RoleEnum) -> Membership:
    membership = (
        db.query(Membership)
        .filter(Membership.organization_id == org_id, Membership.user_id == target_user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if membership.role == RoleEnum.owner and role != RoleEnum.owner:
        _assert_not_last_owner(db, org_id, target_user_id)

    membership.role = role
    audit_service.log(db, org_id, actor_id, "membership.role_changed", "membership", membership.id, {"role": role.value})
    db.commit()
    return membership


def remove_member(db: Session, org_id: str, actor_id: str, target_user_id: str) -> None:
    membership = (
        db.query(Membership)
        .filter(Membership.organization_id == org_id, Membership.user_id == target_user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if membership.role == RoleEnum.owner:
        _assert_not_last_owner(db, org_id, target_user_id)

    db.delete(membership)
    audit_service.log(db, org_id, actor_id, "membership.removed", "membership", membership.id)
    db.commit()


def _assert_not_last_owner(db: Session, org_id: str, excluding_user_id: str) -> None:
    owner_count = (
        db.query(Membership)
        .filter(
            Membership.organization_id == org_id,
            Membership.role == RoleEnum.owner,
            Membership.user_id != excluding_user_id,
        )
        .count()
    )
    if owner_count == 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot remove the last Owner")
