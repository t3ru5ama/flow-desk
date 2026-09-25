from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.core.dev_mail import get_last

router = APIRouter(prefix="/api/dev", tags=["dev"])


@router.get("/last-email")
def last_email():
    if not settings.debug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    email = get_last()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No email sent yet")
    return email
