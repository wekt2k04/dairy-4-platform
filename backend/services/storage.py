from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from schemas.video import VideoUploadResponse


async def store_video_upload(video: UploadFile) -> VideoUploadResponse:
    uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    safe_name = f"{uuid4().hex}-{Path(video.filename or 'farm-video.mp4').name}"
    destination = uploads_dir / safe_name

    with destination.open("wb") as target:
        shutil.copyfileobj(video.file, target)

    return VideoUploadResponse(
        video_url=f"/static/uploads/{safe_name}",
        filename=safe_name,
    )