from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.comment import Comment, CommentableType
from app.models.label import Label, TaskLabel
from app.models.notification import NotificationType
from app.models.task import Task, TaskStatus
from app.models.project import Priority
from app.schemas.task import TaskCreate, TaskUpdate
from app.services import audit_service, notification_service


def _set_labels(db: Session, task: Task, label_ids: list[str]) -> None:
    db.query(TaskLabel).filter(TaskLabel.task_id == task.id).delete()
    for label_id in label_ids:
        db.add(TaskLabel(task_id=task.id, label_id=label_id))


def list_tasks(
    db: Session, org_id: str, project_id: str | None, status_filter: TaskStatus | None,
    priority: Priority | None, assignee_id: str | None, search: str | None,
    sort: str | None, page: int, page_size: int,
) -> tuple[list[Task], int]:
    query = db.query(Task).filter(Task.organization_id == org_id)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority:
        query = query.filter(Task.priority == priority)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Task.title.ilike(like), Task.description.ilike(like)))

    sort_map = {"due_date": Task.due_date, "priority": Task.priority, "created_at": Task.created_at}
    if sort and sort.lstrip("-") in sort_map:
        col = sort_map[sort.lstrip("-")]
        query = query.order_by(col.desc() if sort.startswith("-") else col.asc())
    else:
        query = query.order_by(Task.created_at.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_task(db: Session, org_id: str, task_id: str) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.organization_id == org_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def create_task(db: Session, org_id: str, reporter_id: str, payload: TaskCreate) -> Task:
    data = payload.model_dump(exclude={"label_ids"})
    task = Task(organization_id=org_id, reporter_id=reporter_id, **data)
    db.add(task)
    db.flush()
    if payload.label_ids:
        _set_labels(db, task, payload.label_ids)

    audit_service.log(db, org_id, reporter_id, "task.created", "task", task.id, {"title": task.title})
    if task.assignee_id and task.assignee_id != reporter_id:
        notification_service.create(
            db, task.assignee_id, org_id, NotificationType.task_assigned,
            "You were assigned a task", task.title, f"/tasks?taskId={task.id}",
        )
    db.commit()
    return task


def update_task(db: Session, org_id: str, actor_id: str, task_id: str, payload: TaskUpdate) -> Task:
    task = get_task(db, org_id, task_id)
    data = payload.model_dump(exclude_unset=True, exclude={"label_ids"})
    prev_assignee = task.assignee_id
    for field, value in data.items():
        setattr(task, field, value)
    if payload.label_ids is not None:
        _set_labels(db, task, payload.label_ids)

    audit_service.log(db, org_id, actor_id, "task.updated", "task", task.id, data)
    if task.assignee_id and task.assignee_id != prev_assignee:
        notification_service.create(
            db, task.assignee_id, org_id, NotificationType.task_assigned,
            "You were assigned a task", task.title, f"/tasks?taskId={task.id}",
        )
    db.commit()
    return task


def delete_task(db: Session, org_id: str, actor_id: str, task_id: str) -> None:
    task = get_task(db, org_id, task_id)
    db.delete(task)
    audit_service.log(db, org_id, actor_id, "task.deleted", "task", task_id)
    db.commit()


def add_comment(db: Session, org_id: str, author_id: str, task_id: str, body: str) -> Comment:
    task = get_task(db, org_id, task_id)
    comment = Comment(
        organization_id=org_id, commentable_type=CommentableType.task,
        commentable_id=task.id, author_id=author_id, body=body,
    )
    db.add(comment)
    audit_service.log(db, org_id, author_id, "task.comment_added", "task", task.id)
    if task.assignee_id and task.assignee_id != author_id:
        notification_service.create(
            db, task.assignee_id, org_id, NotificationType.comment_added,
            "New comment on your task", task.title, f"/tasks?taskId={task.id}",
        )
    db.commit()
    return comment


def list_comments(db: Session, task_id: str) -> list[Comment]:
    return (
        db.query(Comment)
        .filter(Comment.commentable_type == CommentableType.task, Comment.commentable_id == task_id)
        .order_by(Comment.created_at.asc())
        .all()
    )


def get_or_create_labels(db: Session, org_id: str) -> list[Label]:
    return db.query(Label).filter(Label.organization_id == org_id).all()
