from datetime import datetime
from pydantic import BaseModel, Field


class AuditLogOut(BaseModel):
    id: str
    actor_id: str | None
    action: str
    resource_type: str
    resource_id: str
    metadata: dict | None = Field(None, validation_alias="metadata_json")
    created_at: datetime
    model_config = {"from_attributes": True}


class AuditLogListOut(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    page_size: int
