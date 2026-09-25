import enum
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Enum, JSON, Boolean, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin


class IntegrationProvider(str, enum.Enum):
    github = "github"
    slack = "slack"
    google_drive = "google_drive"
    jira = "jira"
    pagerduty = "pagerduty"


class Integration(Base, UUIDPKMixin):
    __tablename__ = "integrations"
    __table_args__ = (UniqueConstraint("organization_id", "provider"),)

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    provider: Mapped[IntegrationProvider] = mapped_column(Enum(IntegrationProvider), nullable=False)
    connected: Mapped[bool] = mapped_column(Boolean, default=False)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    connected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
