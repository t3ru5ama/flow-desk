from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import require_role
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.integration import Integration, IntegrationProvider
from app.models.membership import RoleEnum
from app.schemas.integration import IntegrationOut, IntegrationUpdate

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("", response_model=list[IntegrationOut])
def list_integrations(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = {
        i.provider: i
        for i in db.query(Integration).filter(Integration.organization_id == current.org_id).all()
    }
    result = []
    for provider in IntegrationProvider:
        if provider in existing:
            result.append(existing[provider])
        else:
            result.append(Integration(id="", organization_id=current.org_id, provider=provider, connected=False))
    return result


@router.patch("/{provider}", response_model=IntegrationOut)
def update_integration(
    provider: IntegrationProvider, payload: IntegrationUpdate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.admin)),
):
    integration = (
        db.query(Integration)
        .filter(Integration.organization_id == current.org_id, Integration.provider == provider)
        .first()
    )
    if not integration:
        integration = Integration(organization_id=current.org_id, provider=provider)
        db.add(integration)

    integration.connected = payload.connected
    if payload.config is not None:
        integration.config = payload.config
    integration.connected_at = datetime.now(timezone.utc) if payload.connected else None
    db.commit()
    return integration
