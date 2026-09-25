from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogListOut

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("", response_model=AuditLogListOut)
def list_audit_logs(
    resource_type: str | None = None, resource_id: str | None = None, actor_id: str | None = None,
    since: datetime | None = None, page: int = 1, page_size: int = 20,
    current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    query = db.query(AuditLog).filter(AuditLog.organization_id == current.org_id)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if resource_id:
        query = query.filter(AuditLog.resource_id == resource_id)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if since:
        query = query.filter(AuditLog.created_at >= since)
    query = query.order_by(AuditLog.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return AuditLogListOut(items=items, total=total, page=page, page_size=page_size)
