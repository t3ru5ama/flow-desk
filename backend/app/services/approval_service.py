from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.approval import Approval, ApprovalStatus, ApprovalStep, ApprovalStepApprover, ApprovalStepStatus
from app.models.membership import Membership
from app.models.notification import NotificationType
from app.schemas.approval import ApprovalCreate, ApprovalDecisionRequest
from app.services import audit_service, notification_service


def _with_steps(db: Session, approval_id: str) -> Approval:
    return (
        db.query(Approval)
        .options(joinedload(Approval.steps).joinedload(ApprovalStep.approvers))
        .filter(Approval.id == approval_id)
        .first()
    )


def list_approvals(
    db: Session, org_id: str, user_id: str, status_filter: ApprovalStatus | None,
    filter: str | None, page: int, page_size: int,
) -> tuple[list[Approval], int]:
    query = (
        db.query(Approval)
        .options(joinedload(Approval.steps).joinedload(ApprovalStep.approvers))
        .filter(Approval.organization_id == org_id)
    )
    if status_filter:
        query = query.filter(Approval.status == status_filter)

    if filter == "mine":
        query = query.join(ApprovalStep).join(ApprovalStepApprover).filter(
            ApprovalStepApprover.user_id == user_id,
            ApprovalStep.step_order == Approval.current_step_order,
            Approval.status == ApprovalStatus.pending,
        )
    elif filter == "requested":
        query = query.filter(Approval.requester_id == user_id)

    query = query.order_by(Approval.created_at.desc())
    total = query.distinct().count()
    items = query.distinct().offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_approval(db: Session, org_id: str, approval_id: str) -> Approval:
    approval = _with_steps(db, approval_id)
    if not approval or approval.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")
    return approval


def create_approval(db: Session, org_id: str, requester_id: str, payload: ApprovalCreate) -> Approval:
    all_approver_ids = {uid for step in payload.steps for uid in step.approver_ids}
    org_member_ids = {
        m.user_id for m in db.query(Membership).filter(Membership.organization_id == org_id).all()
    }
    if not all_approver_ids.issubset(org_member_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="All approvers must belong to the organization",
        )

    approval = Approval(organization_id=org_id, title=payload.title, description=payload.description, requester_id=requester_id)
    db.add(approval)
    db.flush()

    for i, step_data in enumerate(payload.steps, start=1):
        step = ApprovalStep(approval_id=approval.id, step_order=i)
        db.add(step)
        db.flush()
        for uid in step_data.approver_ids:
            db.add(ApprovalStepApprover(approval_step_id=step.id, user_id=uid))

    audit_service.log(db, org_id, requester_id, "approval.created", "approval", approval.id)

    first_step_approvers = payload.steps[0].approver_ids
    for uid in first_step_approvers:
        notification_service.create(
            db, uid, org_id, NotificationType.approval_requested,
            "Approval requested", approval.title, f"/approvals?approvalId={approval.id}",
        )
    db.commit()
    return get_approval(db, org_id, approval.id)


def decide_step(
    db: Session, org_id: str, actor_id: str, approval_id: str, step_id: str, payload: ApprovalDecisionRequest,
) -> Approval:
    approval = get_approval(db, org_id, approval_id)
    step = next((s for s in approval.steps if s.id == step_id), None)
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    if approval.status != ApprovalStatus.pending or step.step_order != approval.current_step_order:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This step is not currently active")

    approver_ids = {a.id for a in step.approvers}
    if actor_id not in approver_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an approver on the current step",
        )

    step.decided_by = actor_id
    step.decided_at = datetime.now(timezone.utc)
    step.comment = payload.comment

    if payload.decision == "rejected":
        step.status = ApprovalStepStatus.rejected
        approval.status = ApprovalStatus.rejected
        for later in approval.steps:
            if later.step_order > step.step_order:
                later.status = ApprovalStepStatus.skipped
        audit_service.log(db, org_id, actor_id, "approval.rejected", "approval", approval.id)
        notification_service.create(
            db, approval.requester_id, org_id, NotificationType.approval_decided,
            "Your approval request was rejected", approval.title, f"/approvals?approvalId={approval.id}",
        )
    else:
        step.status = ApprovalStepStatus.approved
        next_step = next((s for s in approval.steps if s.step_order == step.step_order + 1), None)
        if next_step:
            approval.current_step_order = next_step.step_order
            audit_service.log(db, org_id, actor_id, "approval.step_approved", "approval", approval.id, {"step": step.step_order})
            for a in next_step.approvers:
                notification_service.create(
                    db, a.id, org_id, NotificationType.approval_requested,
                    "Approval requested", approval.title, f"/approvals?approvalId={approval.id}",
                )
        else:
            approval.status = ApprovalStatus.approved
            audit_service.log(db, org_id, actor_id, "approval.approved", "approval", approval.id)
            notification_service.create(
                db, approval.requester_id, org_id, NotificationType.approval_decided,
                "Your approval request was approved", approval.title, f"/approvals?approvalId={approval.id}",
            )

    db.commit()
    return get_approval(db, org_id, approval.id)
