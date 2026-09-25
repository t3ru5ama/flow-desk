from datetime import datetime
from pydantic import BaseModel, Field
from app.models.incident import Severity, IncidentStatus, IncidentEventType


class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    severity: Severity
    assigned_team: str | None = Field(None, max_length=100)
    assigned_user_id: str | None = None


class IncidentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    severity: Severity | None = None
    status: IncidentStatus | None = None
    assigned_team: str | None = Field(None, max_length=100)
    assigned_user_id: str | None = None


class IncidentOut(BaseModel):
    id: str
    organization_id: str
    title: str
    description: str | None
    severity: Severity
    status: IncidentStatus
    assigned_team: str | None
    assigned_user_id: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    model_config = {"from_attributes": True}


class IncidentListOut(BaseModel):
    items: list[IncidentOut]
    total: int
    page: int
    page_size: int


class IncidentEventOut(BaseModel):
    id: str
    event_type: IncidentEventType
    actor_id: str
    description: str
    metadata: dict | None = Field(None, validation_alias="metadata_json")
    created_at: datetime
    model_config = {"from_attributes": True}


class IncidentTaskLink(BaseModel):
    task_id: str
