import enum
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin, TimestampMixin


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ApprovalStepStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    skipped = "skipped"


class Approval(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "approvals"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requester_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    status: Mapped[ApprovalStatus] = mapped_column(Enum(ApprovalStatus), default=ApprovalStatus.pending)
    current_step_order: Mapped[int] = mapped_column(Integer, default=1)

    steps: Mapped[list["ApprovalStep"]] = relationship(back_populates="approval", order_by="ApprovalStep.step_order")


class ApprovalStep(Base, UUIDPKMixin):
    __tablename__ = "approval_steps"
    __table_args__ = (UniqueConstraint("approval_id", "step_order"),)

    approval_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("approvals.id"), index=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ApprovalStepStatus] = mapped_column(Enum(ApprovalStepStatus), default=ApprovalStepStatus.pending)
    decided_by: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    approval: Mapped["Approval"] = relationship(back_populates="steps")
    approvers: Mapped[list["User"]] = relationship(secondary="approval_step_approvers")


class ApprovalStepApprover(Base):
    __tablename__ = "approval_step_approvers"

    approval_step_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("approval_steps.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), primary_key=True)
