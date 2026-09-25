import enum
from datetime import date
from sqlalchemy import String, Text, Date, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin, TimestampMixin
from app.models.project import Priority


class TaskStatus(str, enum.Enum):
    backlog = "backlog"
    todo = "todo"
    in_progress = "in_progress"
    review = "review"
    done = "done"


class Task(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "tasks"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    project_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("projects.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.backlog)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.medium)
    assignee_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=True, index=True)
    reporter_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="tasks")
    labels: Mapped[list["Label"]] = relationship(secondary="task_labels")
