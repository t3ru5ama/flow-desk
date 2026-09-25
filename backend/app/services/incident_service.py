from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.comment import Comment, CommentableType
from app.models.incident import (
    Incident,
    IncidentEvent,
    IncidentEventType,
    IncidentStatus,
    IncidentTask,
    Severity,
    INCIDENT_STATUS_ORDER,
)
from app.models.notification import NotificationType
from app.models.task import Task
from app.schemas.incident import IncidentCreate, IncidentUpdate
from app.services import audit_service, notification_service


def _write_event(
    db: Session, incident_id: str, event_type: IncidentEventType, actor_id: str,
    description: str, metadata: dict | None = None,
) -> None:
    db.add(
        IncidentEvent(
            incident_id=incident_id, event_type=event_type, actor_id=actor_id,
            description=description, metadata_json=metadata,
        )
    )


def list_incidents(
    db: Session, org_id: str, severity: Severity | None, status_filter: IncidentStatus | None,
    assigned_team: str | None, page: int, page_size: int,
) -> tuple[list[Incident], int]:
    query = db.query(Incident).filter(Incident.organization_id == org_id)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    if assigned_team:
        query = query.filter(Incident.assigned_team == assigned_team)
    total = query.count()
    items = query.order_by(Incident.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_incident(db: Session, org_id: str, incident_id: str) -> Incident:
    incident = db.query(Incident).filter(Incident.id == incident_id, Incident.organization_id == org_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return incident


def create_incident(db: Session, org_id: str, actor_id: str, payload: IncidentCreate) -> Incident:
    incident = Incident(organization_id=org_id, **payload.model_dump())
    db.add(incident)
    db.flush()

    _write_event(db, incident.id, IncidentEventType.created, actor_id, "Incident created")
    audit_service.log(db, org_id, actor_id, "incident.created", "incident", incident.id, {"severity": incident.severity.value})

    if incident.assigned_user_id and incident.assigned_user_id != actor_id:
        notification_service.create(
            db, incident.assigned_user_id, org_id, NotificationType.incident_assigned,
            "You were assigned an incident", incident.title, f"/incidents/{incident.id}",
        )
    db.commit()
    return incident


def update_incident(db: Session, org_id: str, actor_id: str, incident_id: str, payload: IncidentUpdate) -> Incident:
    incident = get_incident(db, org_id, incident_id)
    data = payload.model_dump(exclude_unset=True)

    if "status" in data and data["status"] != incident.status:
        new_status = data["status"]
        _validate_transition(incident.status, new_status)
        old_status = incident.status
        incident.status = new_status
        if new_status == IncidentStatus.resolved:
            incident.resolved_at = datetime.now(timezone.utc)
        _write_event(
            db, incident.id, IncidentEventType.status_changed, actor_id,
            f"Status changed from '{old_status.value}' to '{new_status.value}'",
            {"from": old_status.value, "to": new_status.value},
        )
        audit_service.log(
            db, org_id, actor_id, "incident.status_changed", "incident", incident.id,
            {"from": old_status.value, "to": new_status.value},
        )
        data.pop("status")

    if "assigned_user_id" in data and data["assigned_user_id"] != incident.assigned_user_id:
        new_assignee = data["assigned_user_id"]
        incident.assigned_user_id = new_assignee
        _write_event(db, incident.id, IncidentEventType.reassigned, actor_id, "Incident reassigned")
        audit_service.log(db, org_id, actor_id, "incident.reassigned", "incident", incident.id)
        if new_assignee and new_assignee != actor_id:
            notification_service.create(
                db, new_assignee, org_id, NotificationType.incident_assigned,
                "You were assigned an incident", incident.title, f"/incidents/{incident.id}",
            )
        data.pop("assigned_user_id")

    for field, value in data.items():
        setattr(incident, field, value)

    audit_service.log(db, org_id, actor_id, "incident.updated", "incident", incident.id)
    db.commit()
    return incident


def _validate_transition(current: IncidentStatus, new: IncidentStatus) -> None:
    current_idx = INCIDENT_STATUS_ORDER.index(current)
    new_idx = INCIDENT_STATUS_ORDER.index(new)
    if new_idx < current_idx:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot move an incident backward in its lifecycle",
        )


def list_events(db: Session, incident_id: str) -> list[IncidentEvent]:
    return (
        db.query(IncidentEvent)
        .filter(IncidentEvent.incident_id == incident_id)
        .order_by(IncidentEvent.created_at.asc())
        .all()
    )


def add_comment(db: Session, org_id: str, author_id: str, incident_id: str, body: str) -> Comment:
    incident = get_incident(db, org_id, incident_id)
    comment = Comment(
        organization_id=org_id, commentable_type=CommentableType.incident,
        commentable_id=incident.id, author_id=author_id, body=body,
    )
    db.add(comment)
    _write_event(db, incident.id, IncidentEventType.comment_added, author_id, "Comment added")
    audit_service.log(db, org_id, author_id, "incident.comment_added", "incident", incident.id)
    db.commit()
    return comment


def list_comments(db: Session, incident_id: str) -> list[Comment]:
    return (
        db.query(Comment)
        .filter(Comment.commentable_type == CommentableType.incident, Comment.commentable_id == incident_id)
        .order_by(Comment.created_at.asc())
        .all()
    )


def link_task(db: Session, org_id: str, actor_id: str, incident_id: str, task_id: str) -> None:
    incident = get_incident(db, org_id, incident_id)
    exists = (
        db.query(IncidentTask)
        .filter(IncidentTask.incident_id == incident.id, IncidentTask.task_id == task_id)
        .first()
    )
    if exists:
        return
    db.add(IncidentTask(incident_id=incident.id, task_id=task_id))
    _write_event(db, incident.id, IncidentEventType.task_linked, actor_id, "Task linked to incident")
    audit_service.log(db, org_id, actor_id, "incident.task_linked", "incident", incident.id, {"task_id": task_id})
    db.commit()


def list_linked_tasks(db: Session, org_id: str, incident_id: str) -> list[Task]:
    get_incident(db, org_id, incident_id)
    return (
        db.query(Task)
        .join(IncidentTask, IncidentTask.task_id == Task.id)
        .filter(IncidentTask.incident_id == incident_id)
        .all()
    )
