"""Idempotent-safe demo seed: skips if Acme Technologies already exists.
Run via `python -m app.seed`. Calls the real services (not raw inserts) so
audit hooks and notification hooks fire naturally."""

from datetime import date, datetime, timedelta, timezone

from app.core.security import hash_password
from app.db import SessionLocal
from app.models.approval import Approval, ApprovalStatus, ApprovalStep, ApprovalStepApprover, ApprovalStepStatus
from app.models.document import Document
from app.models.incident import Incident, IncidentEvent, IncidentEventType, Severity, IncidentStatus
from app.models.label import Label, TaskLabel
from app.models.membership import Membership, RoleEnum
from app.models.notification import Notification, NotificationType
from app.models.organization import Organization
from app.models.project import Project, ProjectStatus, Priority
from app.models.project_member import ProjectMember
from app.models.subscription import Subscription, PlanEnum, PLAN_LIMITS
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.services import audit_service

SEED_PASSWORD = "Password123!"


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(Organization).filter(Organization.name == "Acme Technologies").first():
            print("Seed data already present, skipping.")
            return

        org = Organization(name="Acme Technologies")
        db.add(org)
        db.flush()
        db.add(Subscription(organization_id=org.id, plan=PlanEnum.business, **PLAN_LIMITS[PlanEnum.business]))

        users = {}
        for name, email, role in [
            ("Alex Morgan", "alex@acme.test", RoleEnum.owner),
            ("Sarah Chen", "sarah@acme.test", RoleEnum.admin),
            ("Daniel Patel", "daniel@acme.test", RoleEnum.manager),
            ("Maya Singh", "maya@acme.test", RoleEnum.manager),
            ("James Wilson", "james@acme.test", RoleEnum.member),
        ]:
            user = User(name=name, email=email, password_hash=hash_password(SEED_PASSWORD))
            db.add(user)
            db.flush()
            db.add(Membership(organization_id=org.id, user_id=user.id, role=role))
            users[name] = user
        db.commit()

        alex, sarah, daniel, maya, james = (
            users["Alex Morgan"], users["Sarah Chen"], users["Daniel Patel"], users["Maya Singh"], users["James Wilson"]
        )

        labels = {}
        for name, color in [("bug", "#A3453A"), ("feature", "#6B8E5A"), ("urgent", "#B08D57")]:
            label = Label(organization_id=org.id, name=name, color=color)
            db.add(label)
            db.flush()
            labels[name] = label

        projects_data = [
            ("Platform Migration", "Move core services to the new infra.", ProjectStatus.active, Priority.high, daniel, [daniel, james]),
            ("Q3 Security Audit", "Full audit of access controls and infra.", ProjectStatus.active, Priority.critical, maya, [maya, sarah]),
            ("Customer Portal Redesign", "Refresh the customer-facing portal UI.", ProjectStatus.on_hold, Priority.medium, daniel, [daniel, james, sarah]),
        ]
        projects = []
        for name, desc, pstatus, priority, owner, members in projects_data:
            project = Project(
                organization_id=org.id, name=name, description=desc, owner_id=owner.id,
                status=pstatus, priority=priority,
                start_date=date.today() - timedelta(days=30), due_date=date.today() + timedelta(days=60),
            )
            db.add(project)
            db.flush()
            for m in members:
                db.add(ProjectMember(project_id=project.id, user_id=m.id))
            audit_service.log(db, org.id, owner.id, "project.created", "project", project.id, {"name": name})
            projects.append(project)
        db.commit()

        task_defs = [
            ("Fix login redirect bug", TaskStatus.todo, Priority.high, james, alex, ["bug"]),
            ("Set up CI pipeline", TaskStatus.in_progress, Priority.high, daniel, daniel, ["feature"]),
            ("Migrate user table schema", TaskStatus.backlog, Priority.critical, james, daniel, ["urgent"]),
            ("Write migration runbook", TaskStatus.review, Priority.medium, daniel, daniel, []),
            ("Decommission legacy API", TaskStatus.backlog, Priority.low, None, daniel, []),
            ("Review IAM policies", TaskStatus.todo, Priority.critical, maya, maya, ["urgent"]),
            ("Rotate service credentials", TaskStatus.in_progress, Priority.high, sarah, maya, []),
            ("Pen-test findings triage", TaskStatus.backlog, Priority.high, maya, maya, ["bug"]),
            ("Audit third-party access", TaskStatus.done, Priority.medium, sarah, maya, []),
            ("Draft new portal wireframes", TaskStatus.todo, Priority.medium, james, daniel, ["feature"]),
            ("User research interviews", TaskStatus.done, Priority.low, daniel, daniel, []),
            ("Accessibility pass", TaskStatus.backlog, Priority.medium, james, daniel, []),
            ("Fix mobile nav overflow", TaskStatus.review, Priority.low, james, james, ["bug"]),
            ("Set up staging env", TaskStatus.done, Priority.medium, daniel, daniel, []),
            ("Load test checkout flow", TaskStatus.backlog, Priority.high, None, daniel, ["urgent"]),
            ("Update onboarding docs", TaskStatus.todo, Priority.low, sarah, alex, []),
            ("Investigate flaky test suite", TaskStatus.in_progress, Priority.medium, james, james, ["bug"]),
        ]
        tasks = []
        for i, (title, tstatus, priority, assignee, reporter, label_names) in enumerate(task_defs):
            project = projects[i % len(projects)]
            task = Task(
                organization_id=org.id, project_id=project.id, title=title, status=tstatus,
                priority=priority, assignee_id=assignee.id if assignee else None, reporter_id=reporter.id,
                due_date=date.today() + timedelta(days=7 + i),
            )
            db.add(task)
            db.flush()
            for lname in label_names:
                db.add(TaskLabel(task_id=task.id, label_id=labels[lname].id))
            audit_service.log(db, org.id, reporter.id, "task.created", "task", task.id, {"title": title})
            if assignee:
                db.add(Notification(
                    user_id=assignee.id, organization_id=org.id, type=NotificationType.task_assigned,
                    title="You were assigned a task", body=title, link=f"/tasks?taskId={task.id}",
                    read=(i % 3 == 0),
                ))
            tasks.append(task)
        db.commit()

        from app.models.comment import Comment, CommentableType
        for task in tasks[:6]:
            db.add(Comment(
                organization_id=org.id, commentable_type=CommentableType.task, commentable_id=task.id,
                author_id=task.reporter_id, body="Started looking into this, will update soon.",
            ))
        db.commit()

        incident_defs = [
            ("Database connection pool exhausted", Severity.sev2, IncidentStatus.resolved, "Engineering", daniel, True),
            ("Unauthorized access attempt detected", Severity.sev1, IncidentStatus.investigating, "Security", maya, False),
            ("API latency spike on checkout", Severity.sev3, IncidentStatus.detected, "Engineering", None, False),
            ("Backup job silently failing", Severity.sev3, IncidentStatus.monitoring, "Operations", sarah, False),
            ("SSL certificate expiring soon", Severity.sev4, IncidentStatus.mitigating, "Security", maya, False),
        ]
        for title, severity, istatus, team, assignee, resolved in incident_defs:
            incident = Incident(
                organization_id=org.id, title=title, description=f"{title} — under investigation.",
                severity=severity, status=istatus, assigned_team=team,
                assigned_user_id=assignee.id if assignee else None,
                resolved_at=datetime.now(timezone.utc) if resolved else None,
            )
            db.add(incident)
            db.flush()
            db.add(IncidentEvent(incident_id=incident.id, event_type=IncidentEventType.created, actor_id=alex.id, description="Incident created"))
            if istatus != IncidentStatus.detected:
                db.add(IncidentEvent(
                    incident_id=incident.id, event_type=IncidentEventType.status_changed, actor_id=alex.id,
                    description=f"Status changed from 'detected' to '{istatus.value}'",
                    metadata_json={"from": "detected", "to": istatus.value},
                ))
            db.add(Comment(
                organization_id=org.id, commentable_type=CommentableType.incident, commentable_id=incident.id,
                author_id=alex.id, body="Team is on it.",
            ))
            audit_service.log(db, org.id, alex.id, "incident.created", "incident", incident.id, {"severity": severity.value})
            if assignee:
                db.add(Notification(
                    user_id=assignee.id, organization_id=org.id, type=NotificationType.incident_assigned,
                    title="You were assigned an incident", body=title, link=f"/incidents/{incident.id}",
                ))
        db.commit()

        approval_defs = [
            ("Production Deployment — v2.4.0", [[daniel.id], [maya.id]], "approved"),
            ("Q4 Budget Increase Request", [[sarah.id]], "pending"),
            ("Vendor Access Grant — Datadog", [[maya.id]], "rejected"),
        ]
        for title, step_approver_ids, outcome in approval_defs:
            approval = Approval(organization_id=org.id, title=title, requester_id=alex.id, current_step_order=1)
            db.add(approval)
            db.flush()
            for i, approver_ids in enumerate(step_approver_ids, start=1):
                step = ApprovalStep(approval_id=approval.id, step_order=i)
                db.add(step)
                db.flush()
                for uid in approver_ids:
                    db.add(ApprovalStepApprover(approval_step_id=step.id, user_id=uid))

            db.flush()
            steps = db.query(ApprovalStep).filter(ApprovalStep.approval_id == approval.id).order_by(ApprovalStep.step_order).all()
            if outcome == "approved":
                for step in steps:
                    step.status = ApprovalStepStatus.approved
                    step.decided_by = step.approvers[0].id if step.approvers else alex.id
                    step.decided_at = datetime.now(timezone.utc)
                approval.status = ApprovalStatus.approved
                approval.current_step_order = len(steps)
            elif outcome == "rejected":
                steps[0].status = ApprovalStepStatus.rejected
                steps[0].decided_by = step_approver_ids[0][0]
                steps[0].decided_at = datetime.now(timezone.utc)
                steps[0].comment = "Not approved at this time."
                approval.status = ApprovalStatus.rejected
            audit_service.log(db, org.id, alex.id, "approval.created", "approval", approval.id)
        db.commit()

        for task, project in [(tasks[0], projects[0]), (tasks[5], projects[1])]:
            doc = Document(
                organization_id=org.id, filename=f"{project.name.replace(' ', '_')}-notes.txt",
                storage_key=f"seed-{project.id}.txt", content_type="text/plain", size_bytes=42,
                uploaded_by=alex.id, project_id=project.id,
            )
            db.add(doc)
        db.commit()

        print(f"Seed complete. Log in as any seeded user with password: {SEED_PASSWORD}")
        for name, user in users.items():
            print(f"  {name} — {user.email}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
