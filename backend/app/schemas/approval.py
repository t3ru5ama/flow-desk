from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, model_validator
from app.models.approval import ApprovalStatus, ApprovalStepStatus


class ApprovalStepCreate(BaseModel):
    approver_ids: list[str] = Field(..., min_length=1)


class ApprovalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    steps: list[ApprovalStepCreate] = Field(..., min_length=1)


class ApprovalStepOut(BaseModel):
    id: str
    step_order: int
    status: ApprovalStepStatus
    decided_by: str | None
    decided_at: datetime | None
    comment: str | None
    approver_ids: list[str] = Field(default_factory=list)
    model_config = {"from_attributes": True}


class ApprovalOut(BaseModel):
    id: str
    title: str
    description: str | None
    requester_id: str
    status: ApprovalStatus
    current_step_order: int
    steps: list[ApprovalStepOut]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ApprovalListOut(BaseModel):
    items: list[ApprovalOut]
    total: int
    page: int
    page_size: int


class ApprovalDecisionRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    comment: str | None = Field(None, max_length=2_000)

    @model_validator(mode="after")
    def comment_required_on_reject(self):
        if self.decision == "rejected" and not (self.comment and self.comment.strip()):
            raise ValueError("comment is required when rejecting")
        return self
