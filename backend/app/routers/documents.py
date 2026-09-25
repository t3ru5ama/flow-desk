from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.permissions import require_role
from app.core.storage import storage_provider
from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.membership import RoleEnum
from app.schemas.document import DocumentListOut, DocumentOut
from app.services import document_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=DocumentListOut)
def list_documents(
    project_id: str | None = None, incident_id: str | None = None, page: int = 1, page_size: int = 20,
    current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    items, total = document_service.list_documents(db, current.org_id, project_id, incident_id, page, page_size)
    return DocumentListOut(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=DocumentOut, status_code=201)
def upload_document(
    file: UploadFile = File(...), project_id: str | None = Form(None), incident_id: str | None = Form(None),
    db: Session = Depends(get_db), current: CurrentUser = Depends(require_role(RoleEnum.member)),
):
    return document_service.upload_document(db, current.org_id, current.id, file, project_id, incident_id)


@router.get("/{document_id}/download")
def download_document(document_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = document_service.get_document(db, current.org_id, document_id)
    path = storage_provider.get_path(doc.storage_key)
    return FileResponse(path, media_type=doc.content_type, filename=doc.filename)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: str, db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_role(RoleEnum.member)),
):
    document_service.delete_document(db, current.org_id, current.id, current.role, document_id)
