from datetime import datetime
from pydantic import BaseModel
from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    id: str
    type: NotificationType
    title: str
    body: str | None
    link: str | None
    read: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
    total: int
    page: int
    page_size: int


class UnreadCountOut(BaseModel):
    unread_count: int
