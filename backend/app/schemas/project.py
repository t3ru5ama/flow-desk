from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator
from app.models.project import ProjectStatus, Priority


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    status: ProjectStatus = ProjectStatus.active
    priority: Priority = Priority.medium
    start_date: date | None = None
    due_date: date | None = None

    @model_validator(mode="after")
    def check_dates(self):
        if self.start_date and self.due_date and self.due_date < self.start_date:
            raise ValueError("due_date must be on or after start_date")
        return self


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    status: ProjectStatus | None = None
    priority: Priority | None = None
    start_date: date | None = None
    due_date: date | None = None


class ProjectOut(BaseModel):
    id: str
    organization_id: str
    name: str
    description: str | None
    owner_id: str
    status: ProjectStatus
    priority: Priority
    start_date: date | None
    due_date: date | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ProjectListOut(BaseModel):
    items: list[ProjectOut]
    total: int
    page: int
    page_size: int


class ProjectMemberAdd(BaseModel):
    user_id: str


class ProjectMemberOut(BaseModel):
    user_id: str
    name: str
    email: str
    model_config = {"from_attributes": True}
