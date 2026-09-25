import enum
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum, JSON, func
from sqlalchemy.dialects.mysql import CHAR, DATETIME as MySQLDateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin, TimestampMixin


class Severity(str, enum.Enum):
    sev1 = "sev1"
    sev2 = "sev2"
    sev3 = "sev3"
    sev4 = "sev4"


class IncidentStatus(str, enum.Enum):
    detected = "detected"
    investigating = "investigating"
    mitigating = "mitigating"
    monitoring = "monitoring"
    resolved = "resolved"


INCIDENT_STATUS_ORDER = [
    IncidentStatus.detected,
    IncidentStatus.investigating,
    IncidentStatus.mitigating,
    IncidentStatus.monitoring,
    IncidentStatus.resolved,
]


class Incident(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "incidents"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(Enum(IncidentStatus), default=IncidentStatus.detected)
    assigned_team: Mapped[str | None] = mapped_column(String(100), nullable=True)
    assigned_user_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    events: Mapped[list["IncidentEvent"]] = relationship(back_populates="incident")


class IncidentEventType(str, enum.Enum):
    created = "created"
    status_changed = "status_changed"
    reassigned = "reassigned"
    comment_added = "comment_added"
    document_attached = "document_attached"
    task_linked = "task_linked"


class IncidentEvent(Base, UUIDPKMixin):
    __tablename__ = "incident_events"

    incident_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("incidents.id"), index=True)
    event_type: Mapped[IncidentEventType] = mapped_column(Enum(IncidentEventType), nullable=False)
    actor_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        MySQLDateTime(fsp=6), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    incident: Mapped["Incident"] = relationship(back_populates="events")


class IncidentTask(Base):
    __tablename__ = "incident_tasks"

    incident_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("incidents.id"), primary_key=True)
    task_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("tasks.id"), primary_key=True)
