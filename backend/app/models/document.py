from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin


class Document(Base, UUIDPKMixin):
    __tablename__ = "documents"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    project_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("projects.id"), nullable=True, index=True)
    incident_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("incidents.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
