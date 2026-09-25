from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator
from app.models.task import TaskStatus
from app.models.project import Priority


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    project_id: str | None = None
    status: TaskStatus = TaskStatus.backlog
    priority: Priority = Priority.medium
    assignee_id: str | None = None
    due_date: date | None = None
    label_ids: list[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title cannot be blank")
        return v.strip()


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    status: TaskStatus | None = None
    priority: Priority | None = None
    assignee_id: str | None = None
    due_date: date | None = None
    label_ids: list[str] | None = None


class LabelOut(BaseModel):
    id: str
    name: str
    color: str
    model_config = {"from_attributes": True}


class TaskOut(BaseModel):
    id: str
    project_id: str | None
    title: str
    description: str | None
    status: TaskStatus
    priority: Priority
    assignee_id: str | None
    reporter_id: str
    due_date: date | None
    labels: list[LabelOut]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class TaskListOut(BaseModel):
    items: list[TaskOut]
    total: int
    page: int
    page_size: int


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5_000)

    @field_validator("body")
    @classmethod
    def body_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("body cannot be blank")
        return v.strip()


class CommentOut(BaseModel):
    id: str
    author_id: str
    body: str
    created_at: datetime
    model_config = {"from_attributes": True}
