from datetime import datetime
from pydantic import BaseModel, Field
from app.core.validators import Email
from app.models.membership import RoleEnum


class OrganizationOut(BaseModel):
    id: str
    name: str
    model_config = {"from_attributes": True}


class OrganizationUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class MembershipOut(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    role: RoleEnum
    joined_at: datetime
    model_config = {"from_attributes": True}


class InviteCreate(BaseModel):
    email: Email
    role: RoleEnum

    @property
    def is_valid_role(self) -> bool:
        return self.role != RoleEnum.owner


class InviteOut(BaseModel):
    id: str
    email: str
    role: RoleEnum
    expires_at: datetime
    model_config = {"from_attributes": True}


class InviteAcceptRequest(BaseModel):
    token: str
    name: str | None = None
    password: str | None = None


class MemberRoleUpdate(BaseModel):
    role: RoleEnum
