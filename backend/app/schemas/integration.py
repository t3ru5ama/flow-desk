from datetime import datetime
from pydantic import BaseModel
from app.models.integration import IntegrationProvider


class IntegrationUpdate(BaseModel):
    connected: bool
    config: dict | None = None


class IntegrationOut(BaseModel):
    id: str
    provider: IntegrationProvider
    connected: bool
    config: dict | None
    connected_at: datetime | None
    model_config = {"from_attributes": True}
