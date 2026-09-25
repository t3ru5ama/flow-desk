import enum
from sqlalchemy import Integer, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin, TimestampMixin


class PlanEnum(str, enum.Enum):
    free = "free"
    starter = "starter"
    business = "business"
    enterprise = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    past_due = "past_due"
    canceled = "canceled"


PLAN_LIMITS = {
    PlanEnum.free: {"user_limit": 5, "project_limit": 3},
    PlanEnum.starter: {"user_limit": 20, "project_limit": 15},
    PlanEnum.business: {"user_limit": 100, "project_limit": 100},
    PlanEnum.enterprise: {"user_limit": 1_000_000, "project_limit": 1_000_000},
}


class Subscription(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), unique=True)
    plan: Mapped[PlanEnum] = mapped_column(Enum(PlanEnum), default=PlanEnum.free)
    status: Mapped[SubscriptionStatus] = mapped_column(Enum(SubscriptionStatus), default=SubscriptionStatus.active)
    user_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    project_limit: Mapped[int] = mapped_column(Integer, nullable=False)
