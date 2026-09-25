from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_role
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.membership import RoleEnum
from app.models.project import Priority
from app.models.task import TaskStatus
from app.schemas.task import CommentCreate, CommentOut, TaskCreate, TaskListOut, TaskOut, TaskUpdate
from app.services import task_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=TaskListOut)
def list_tasks(
    project_id: str | None = None, status: TaskStatus | None = None, priority: Priority | None = None,
    assignee_id: str | None = None, search: str | None = None, sort: str | None = None,
    page: int = 1, page_size: int = 20,
    current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    items, total = task_service.list_tasks(
        db, current.org_id, project_id, status, priority, assignee_id, search, sort, page, page_size,
    )
    return TaskListOut(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    payload: TaskCreate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.member)),
):
    return task_service.create_task(db, current.org_id, current.id, payload)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return task_service.get_task(db, current.org_id, task_id)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str, payload: TaskUpdate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.member)),
):
    return task_service.update_task(db, current.org_id, current.id, task_id, payload)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: str, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.manager)),
):
    task_service.delete_task(db, current.org_id, current.id, task_id)


@router.post("/{task_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    task_id: str, payload: CommentCreate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.member)),
):
    return task_service.add_comment(db, current.org_id, current.id, task_id, payload.body)


@router.get("/{task_id}/comments", response_model=list[CommentOut])
def list_comments(task_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return task_service.list_comments(db, task_id)
