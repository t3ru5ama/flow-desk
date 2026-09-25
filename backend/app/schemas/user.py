from pydantic import BaseModel, Field


class UserUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    password: str | None = None


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    model_config = {"from_attributes": True}
