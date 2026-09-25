import re
from pydantic import BaseModel, Field, field_validator
from app.core.validators import Email

PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Email
    password: str
    organization_name: str = Field(..., min_length=1, max_length=255)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not PASSWORD_RE.match(v):
            raise ValueError("password must be at least 8 characters and contain a letter and a digit")
        return v

    @field_validator("name", "organization_name")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("cannot be blank")
        return v.strip()


class LoginRequest(BaseModel):
    email: Email
    password: str


class ForgotPasswordRequest(BaseModel):
    email: Email


class ResetPasswordRequest(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not PASSWORD_RE.match(v):
            raise ValueError("password must be at least 8 characters and contain a letter and a digit")
        return v


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    model_config = {"from_attributes": True}


class OrganizationOut(BaseModel):
    id: str
    name: str
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    user: UserOut
    organization: OrganizationOut


class AccessTokenOnly(BaseModel):
    access_token: str
