from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_role
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.membership import RoleEnum
from app.models.project import Priority, ProjectStatus
from app.schemas.project import (
    ProjectCreate,
    ProjectListOut,
    ProjectMemberAdd,
    ProjectMemberOut,
    ProjectOut,
    ProjectUpdate,
)
from app.services import project_service

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=ProjectListOut)
def list_projects(
    status: ProjectStatus | None = None, priority: Priority | None = None,
    page: int = 1, page_size: int = 20,
    current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    items, total = project_service.list_projects(db, current.org_id, status, priority, page, page_size)
    return ProjectListOut(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.manager)),
):
    return project_service.create_project(db, current.org_id, current.id, payload)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return project_service.get_project(db, current.org_id, project_id)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.manager)),
):
    return project_service.update_project(db, current.org_id, current.id, project_id, payload)


@router.delete("/{project_id}", response_model=ProjectOut)
def archive_project(
    project_id: str, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.manager)),
):
    return project_service.archive_project(db, current.org_id, current.id, project_id)


@router.post("/{project_id}/members", status_code=204)
def add_member(
    project_id: str, payload: ProjectMemberAdd, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.manager)),
):
    project_service.add_member(db, current.org_id, current.id, project_id, payload.user_id)


@router.delete("/{project_id}/members/{user_id}", status_code=204)
def remove_member(
    project_id: str, user_id: str, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.manager)),
):
    project_service.remove_member(db, current.org_id, current.id, project_id, user_id)


@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
def list_members(project_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    users = project_service.list_members(db, project_id)
    return [ProjectMemberOut(user_id=u.id, name=u.name, email=u.email) for u in users]
