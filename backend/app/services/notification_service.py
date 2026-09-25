from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType


def create(
    db: Session,
    user_id: str,
    org_id: str,
    type: NotificationType,
    title: str,
    body: str | None = None,
    link: str | None = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        organization_id=org_id,
        type=type,
        title=title,
        body=body,
        link=link,
    )
    db.add(n)
    db.flush()
    return n
