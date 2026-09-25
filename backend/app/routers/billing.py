from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_role
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.membership import Membership, RoleEnum
from app.models.project import Project
from app.models.subscription import PLAN_LIMITS, Subscription
from app.schemas.billing import SubscriptionOut, SubscriptionUpdate, UsageOut

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get("/subscription", response_model=SubscriptionOut)
def get_subscription(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Subscription).filter(Subscription.organization_id == current.org_id).first()


@router.patch("/subscription", response_model=SubscriptionOut)
def update_subscription(
    payload: SubscriptionUpdate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.admin)),
):
    sub = db.query(Subscription).filter(Subscription.organization_id == current.org_id).first()
    limits = PLAN_LIMITS[payload.plan]
    sub.plan = payload.plan
    sub.user_limit = limits["user_limit"]
    sub.project_limit = limits["project_limit"]
    db.commit()
    return sub


@router.get("/usage", response_model=UsageOut)
def get_usage(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.organization_id == current.org_id).first()
    users_used = db.query(Membership).filter(Membership.organization_id == current.org_id).count()
    projects_used = db.query(Project).filter(Project.organization_id == current.org_id).count()
    return UsageOut(
        users_used=users_used, user_limit=sub.user_limit,
        projects_used=projects_used, project_limit=sub.project_limit,
    )
