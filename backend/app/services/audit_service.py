from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log(
    db: Session,
    org_id: str,
    actor_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str,
    metadata: dict | None = None,
) -> AuditLog:
    entry = AuditLog(
        organization_id=org_id,
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_json=metadata,
    )
    db.add(entry)
    db.flush()
    return entry
