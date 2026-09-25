from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin


class Label(Base, UUIDPKMixin):
    __tablename__ = "labels"
    __table_args__ = (UniqueConstraint("organization_id", "name"),)

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)


class TaskLabel(Base):
    __tablename__ = "task_labels"

    task_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("tasks.id"), primary_key=True)
    label_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("labels.id"), primary_key=True)
