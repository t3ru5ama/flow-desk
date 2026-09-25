import enum
from sqlalchemy import Text, ForeignKey, Enum, Index
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin, TimestampMixin


class CommentableType(str, enum.Enum):
    task = "task"
    incident = "incident"
    approval = "approval"


class Comment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "comments"
    __table_args__ = (Index("ix_commentable", "commentable_type", "commentable_id"),)

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    commentable_type: Mapped[CommentableType] = mapped_column(Enum(CommentableType), nullable=False)
    commentable_id: Mapped[str] = mapped_column(CHAR(36), nullable=False)
    author_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text, nullable=False)
