from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_role
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.approval import ApprovalStatus
from app.models.membership import RoleEnum
from app.schemas.approval import (
    ApprovalCreate,
    ApprovalDecisionRequest,
    ApprovalListOut,
    ApprovalOut,
    ApprovalStepOut,
)
from app.services import approval_service

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


def _to_out(approval) -> ApprovalOut:
    return ApprovalOut(
        id=approval.id, title=approval.title, description=approval.description,
        requester_id=approval.requester_id, status=approval.status,
        current_step_order=approval.current_step_order,
        steps=[
            ApprovalStepOut(
                id=s.id, step_order=s.step_order, status=s.status, decided_by=s.decided_by,
                decided_at=s.decided_at, comment=s.comment, approver_ids=[a.id for a in s.approvers],
            )
            for s in approval.steps
        ],
        created_at=approval.created_at, updated_at=approval.updated_at,
    )


@router.get("", response_model=ApprovalListOut)
def list_approvals(
    status: ApprovalStatus | None = None, filter: str | None = None, page: int = 1, page_size: int = 20,
    current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    items, total = approval_service.list_approvals(db, current.org_id, current.id, status, filter, page, page_size)
    return ApprovalListOut(items=[_to_out(a) for a in items], total=total, page=page, page_size=page_size)


@router.post("", response_model=ApprovalOut, status_code=201)
def create_approval(
    payload: ApprovalCreate, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.manager)),
):
    return _to_out(approval_service.create_approval(db, current.org_id, current.id, payload))


@router.get("/{approval_id}", response_model=ApprovalOut)
def get_approval(approval_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return _to_out(approval_service.get_approval(db, current.org_id, approval_id))


@router.post("/{approval_id}/steps/{step_id}/decide", response_model=ApprovalOut)
def decide_step(
    approval_id: str, step_id: str, payload: ApprovalDecisionRequest, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.manager)),
):
    return _to_out(approval_service.decide_step(db, current.org_id, current.id, approval_id, step_id, payload))
