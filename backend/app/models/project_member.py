from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("projects.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), primary_key=True)
    added_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
