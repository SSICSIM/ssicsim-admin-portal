from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import BinaryIO

try:
    from supabase import create_client, Client  # type: ignore
except ImportError:
    Client = None  # type: ignore
    create_client = None  # type: ignore

from app.config import settings


class StorageConfigError(RuntimeError):
    pass


def _supabase_client() -> Client | None:
    if (
        Client is None
        or create_client is None
        or not settings.supabase_url
        or not settings.supabase_service_role_key
        or not settings.supabase_bucket
    ):
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _local_upload(file_obj: BinaryIO, key_prefix: str, filename: str | None) -> str:
    safe_name = Path(filename).name if filename else "upload"
    base, ext = os.path.splitext(safe_name)
    key = f"{base}-{uuid.uuid4()}{ext}"
    rel_path = Path(key_prefix) / key
    base_dir = Path(settings.upload_dir).resolve()
    dest = (base_dir / rel_path).resolve()
    if base_dir != dest and base_dir not in dest.parents:
        raise StorageConfigError("Invalid upload path")
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        f.write(file_obj.read())
    return f"{settings.upload_base_url.rstrip('/')}/{rel_path.as_posix()}"


def upload_file_to_bucket(
    file_obj: BinaryIO,
    *,
    content_type: str | None,
    key_prefix: str = "",
    filename: str | None = None,
) -> str:
    """
    Upload a file-like object to Supabase Storage if configured; otherwise store locally and
    return a URL served from /uploads.
    """
    client = _supabase_client()
    if client is None:
        return _local_upload(file_obj, key_prefix, filename)

    bucket = settings.supabase_bucket  # type: ignore[arg-type]
    name = filename or "upload"
    base, ext = os.path.splitext(name)
    key = f"{key_prefix}{base}-{uuid.uuid4()}{ext}"

    options = {"contentType": content_type} if content_type else {}
    client.storage.from_(bucket).upload(path=key, file=file_obj, file_options=options | {"upsert": False})

    public_base = settings.supabase_public_base_url
    if public_base:
        return f"{public_base.rstrip('/')}/{key}"
    return client.storage.from_(bucket).get_public_url(key)
