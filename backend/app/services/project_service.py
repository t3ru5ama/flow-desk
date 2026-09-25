from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectStatus, Priority
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services import audit_service


def list_projects(
    db: Session, org_id: str, status_filter: ProjectStatus | None, priority: Priority | None,
    page: int, page_size: int,
) -> tuple[list[Project], int]:
    query = db.query(Project).filter(Project.organization_id == org_id)
    if status_filter:
        query = query.filter(Project.status == status_filter)
    if priority:
        query = query.filter(Project.priority == priority)
    total = query.count()
    items = query.order_by(Project.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_project(db: Session, org_id: str, project_id: str) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.organization_id == org_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def create_project(db: Session, org_id: str, owner_id: str, payload: ProjectCreate) -> Project:
    project = Project(organization_id=org_id, owner_id=owner_id, **payload.model_dump())
    db.add(project)
    db.flush()
    audit_service.log(db, org_id, owner_id, "project.created", "project", project.id, {"name": project.name})
    db.commit()
    return project


def update_project(db: Session, org_id: str, actor_id: str, project_id: str, payload: ProjectUpdate) -> Project:
    project = get_project(db, org_id, project_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    audit_service.log(db, org_id, actor_id, "project.updated", "project", project.id)
    db.commit()
    return project


def archive_project(db: Session, org_id: str, actor_id: str, project_id: str) -> Project:
    project = get_project(db, org_id, project_id)
    project.status = ProjectStatus.archived
    audit_service.log(db, org_id, actor_id, "project.archived", "project", project.id)
    db.commit()
    return project


def add_member(db: Session, org_id: str, actor_id: str, project_id: str, user_id: str) -> None:
    project = get_project(db, org_id, project_id)
    exists = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == user_id)
        .first()
    )
    if exists:
        return
    db.add(ProjectMember(project_id=project.id, user_id=user_id))
    audit_service.log(db, org_id, actor_id, "project.member_added", "project", project.id, {"user_id": user_id})
    db.commit()


def remove_member(db: Session, org_id: str, actor_id: str, project_id: str, user_id: str) -> None:
    project = get_project(db, org_id, project_id)
    member = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == user_id)
        .first()
    )
    if member:
        db.delete(member)
        audit_service.log(db, org_id, actor_id, "project.member_removed", "project", project.id, {"user_id": user_id})
        db.commit()


def list_members(db: Session, project_id: str) -> list[User]:
    return (
        db.query(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )
