import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum, Index, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin


class NotificationType(str, enum.Enum):
    task_assigned = "task_assigned"
    incident_assigned = "incident_assigned"
    approval_requested = "approval_requested"
    approval_decided = "approval_decided"
    comment_added = "comment_added"
    team_invited = "team_invited"
    project_activity = "project_activity"


class Notification(Base, UUIDPKMixin):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_user_read", "user_id", "read"),)

    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), index=True)
    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(String(500), nullable=True)
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
