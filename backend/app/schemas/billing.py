from pydantic import BaseModel
from app.models.subscription import PlanEnum, SubscriptionStatus


class SubscriptionOut(BaseModel):
    plan: PlanEnum
    status: SubscriptionStatus
    user_limit: int
    project_limit: int
    model_config = {"from_attributes": True}


class SubscriptionUpdate(BaseModel):
    plan: PlanEnum


class UsageOut(BaseModel):
    users_used: int
    user_limit: int
    projects_used: int
    project_limit: int
