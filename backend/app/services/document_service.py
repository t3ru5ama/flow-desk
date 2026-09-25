import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.storage import storage_provider
from app.models.document import Document
from app.models.membership import RoleEnum
from app.services import audit_service

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "txt", "csv", "zip"}

# Minimal magic-byte signatures, enough to catch an extension/content mismatch
MAGIC_SIGNATURES: dict[str, list[bytes]] = {
    "pdf": [b"%PDF"],
    "png": [b"\x89PNG"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "zip": [b"PK\x03\x04"],
    "docx": [b"PK\x03\x04"],
    "xlsx": [b"PK\x03\x04"],
    "doc": [b"\xd0\xcf\x11\xe0"],
    "xls": [b"\xd0\xcf\x11\xe0"],
    "txt": [],
    "csv": [],
}


def _validate_upload(filename: str, content: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File type not allowed")

    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds size limit")

    signatures = MAGIC_SIGNATURES.get(ext, [])
    if signatures and not any(content.startswith(sig) for sig in signatures):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File content does not match its extension")

    return ext


def list_documents(
    db: Session, org_id: str, project_id: str | None, incident_id: str | None, page: int, page_size: int,
) -> tuple[list[Document], int]:
    query = db.query(Document).filter(Document.organization_id == org_id)
    if project_id:
        query = query.filter(Document.project_id == project_id)
    if incident_id:
        query = query.filter(Document.incident_id == incident_id)
    total = query.count()
    items = query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def upload_document(
    db: Session, org_id: str, uploader_id: str, file: UploadFile,
    project_id: str | None, incident_id: str | None,
) -> Document:
    content = file.file.read()
    ext = _validate_upload(file.filename, content)
    file.file.seek(0)

    key = f"{uuid.uuid4()}.{ext}"
    storage_provider.save(file, key)

    doc = Document(
        organization_id=org_id, filename=file.filename, storage_key=key,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content), uploaded_by=uploader_id,
        project_id=project_id, incident_id=incident_id,
    )
    db.add(doc)
    db.flush()
    audit_service.log(db, org_id, uploader_id, "document.uploaded", "document", doc.id, {"filename": doc.filename})
    db.commit()
    return doc


def get_document(db: Session, org_id: str, document_id: str) -> Document:
    doc = db.query(Document).filter(Document.id == document_id, Document.organization_id == org_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


def delete_document(db: Session, org_id: str, actor_id: str, actor_role: RoleEnum, document_id: str) -> None:
    doc = get_document(db, org_id, document_id)
    if doc.uploaded_by != actor_id and RoleEnum(actor_role).value not in ("manager", "admin", "owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete another user's document")

    storage_provider.delete(doc.storage_key)
    db.delete(doc)
    audit_service.log(db, org_id, actor_id, "document.deleted", "document", document_id)
    db.commit()
