from pathlib import Path
from typing import Protocol

from fastapi import UploadFile

from app.config import settings


class StorageProvider(Protocol):
    def save(self, file: UploadFile, key: str) -> None: ...
    def get_path(self, key: str) -> Path: ...
    def delete(self, key: str) -> None: ...


class LocalStorageProvider:
    def __init__(self, base_path: str = settings.storage_path):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save(self, file: UploadFile, key: str) -> None:
        dest = self.get_path(key)
        with open(dest, "wb") as f:
            f.write(file.file.read())

    def get_path(self, key: str) -> Path:
        return self.base_path / key

    def delete(self, key: str) -> None:
        path = self.get_path(key)
        if path.exists():
            path.unlink()


storage_provider: StorageProvider = LocalStorageProvider()
