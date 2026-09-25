from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dev_mail import record as record_dev_mail
from app.core.permissions import require_role
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.membership import Membership, RoleEnum
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.schemas.organization import (
    InviteAcceptRequest,
    InviteCreate,
    InviteOut,
    MemberRoleUpdate,
    MembershipOut,
    OrganizationOut,
    OrganizationUpdate,
)
from app.services import audit_service, organization_service
from app.core.security import create_access_token, generate_opaque_token, hash_token
from datetime import datetime, timedelta, timezone
from app.models.refresh_token import RefreshToken

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("/{org_id}", response_model=OrganizationOut)
def get_organization(org_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


@router.patch("/{org_id}", response_model=OrganizationOut)
def update_organization(
    org_id: str, payload: OrganizationUpdate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.admin)),
):
    org = db.get(Organization, org_id)
    org.name = payload.name
    audit_service.log(db, org_id, current.id, "organization.updated", "organization", org_id)
    db.commit()
    return org


@router.get("/{org_id}/members", response_model=list[MembershipOut])
def list_members(org_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Membership, User)
        .join(User, User.id == Membership.user_id)
        .filter(Membership.organization_id == org_id)
        .all()
    )
    return [
        MembershipOut(id=m.id, user_id=u.id, name=u.name, email=u.email, role=m.role, joined_at=m.joined_at)
        for m, u in rows
    ]


@router.post("/{org_id}/invites", response_model=InviteOut, status_code=status.HTTP_201_CREATED)
def create_invite(
    org_id: str, payload: InviteCreate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.admin)),
):
    invite, token = organization_service.create_invite(db, org_id, current.id, payload.email, payload.role)
    link = f"{settings.app_url}/invite/accept?token={token}"
    record_dev_mail(payload.email, "You've been invited to FlowDesk", link)
    return invite


@router.post("/invites/accept", response_model=TokenResponse)
def accept_invite(payload: InviteAcceptRequest, db: Session = Depends(get_db)):
    user, membership = organization_service.accept_invite(db, payload.token, payload.name, payload.password)
    org = db.get(Organization, membership.organization_id)
    access_token = create_access_token(user.id, org.id, membership.role.value)
    refresh_token = generate_opaque_token()
    db.add(
        RefreshToken(
            user_id=user.id, token_hash=hash_token(refresh_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days),
        )
    )
    db.commit()
    return TokenResponse(access_token=access_token, user=user, organization=org)


@router.patch("/{org_id}/members/{user_id}", response_model=MembershipOut)
def change_member_role(
    org_id: str, user_id: str, payload: MemberRoleUpdate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.admin)),
):
    membership = organization_service.change_role(db, org_id, current.id, user_id, payload.role)
    user = db.get(User, user_id)
    return MembershipOut(id=membership.id, user_id=user.id, name=user.name, email=user.email, role=membership.role, joined_at=membership.joined_at)


@router.delete("/{org_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    org_id: str, user_id: str, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.admin)),
):
    organization_service.remove_member(db, org_id, current.id, user_id)
