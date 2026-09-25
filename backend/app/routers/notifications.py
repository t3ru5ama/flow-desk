from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.notification import Notification
from app.schemas.notification import NotificationListOut, UnreadCountOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListOut)
def list_notifications(
    unread: bool | None = None, page: int = 1, page_size: int = 20,
    current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == current.id)
    if unread is not None:
        query = query.filter(Notification.read == (not unread))
    query = query.order_by(Notification.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return NotificationListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/unread-count", response_model=UnreadCountOut)
def unread_count(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(Notification).filter(Notification.user_id == current.id, Notification.read == False).count()  # noqa: E712
    return UnreadCountOut(unread_count=count)


@router.patch("/{notification_id}/read", status_code=204)
def mark_read(notification_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current.id).first()
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    n.read = True
    db.commit()


@router.patch("/read-all", status_code=204)
def mark_all_read(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current.id, Notification.read == False).update({"read": True})  # noqa: E712
    db.commit()
