from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_role
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.incident import IncidentStatus, Severity
from app.models.membership import RoleEnum
from app.schemas.incident import (
    IncidentCreate,
    IncidentEventOut,
    IncidentListOut,
    IncidentOut,
    IncidentTaskLink,
    IncidentUpdate,
)
from app.schemas.task import CommentCreate, CommentOut, TaskOut
from app.schemas.document import DocumentListOut
from app.services import document_service, incident_service

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("", response_model=IncidentListOut)
def list_incidents(
    severity: Severity | None = None, status: IncidentStatus | None = None, assigned_team: str | None = None,
    page: int = 1, page_size: int = 20,
    current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    items, total = incident_service.list_incidents(db, current.org_id, severity, status, assigned_team, page, page_size)
    return IncidentListOut(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(
    payload: IncidentCreate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.member)),
):
    return incident_service.create_incident(db, current.org_id, current.id, payload)


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return incident_service.get_incident(db, current.org_id, incident_id)


@router.patch("/{incident_id}", response_model=IncidentOut)
def update_incident(
    incident_id: str, payload: IncidentUpdate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.member)),
):
    return incident_service.update_incident(db, current.org_id, current.id, incident_id, payload)


@router.get("/{incident_id}/events", response_model=list[IncidentEventOut])
def list_events(incident_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return incident_service.list_events(db, incident_id)


@router.post("/{incident_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    incident_id: str, payload: CommentCreate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.member)),
):
    return incident_service.add_comment(db, current.org_id, current.id, incident_id, payload.body)


@router.get("/{incident_id}/comments", response_model=list[CommentOut])
def list_comments(incident_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return incident_service.list_comments(db, incident_id)


@router.post("/{incident_id}/tasks", status_code=204)
def link_task(
    incident_id: str, payload: IncidentTaskLink, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.member)),
):
    incident_service.link_task(db, current.org_id, current.id, incident_id, payload.task_id)


@router.get("/{incident_id}/tasks", response_model=list[TaskOut])
def list_linked_tasks(incident_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return incident_service.list_linked_tasks(db, current.org_id, incident_id)


@router.get("/{incident_id}/documents", response_model=DocumentListOut)
def list_incident_documents(incident_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    items, total = document_service.list_documents(db, current.org_id, None, incident_id, 1, 100)
    return DocumentListOut(items=items, total=total, page=1, page_size=100)
