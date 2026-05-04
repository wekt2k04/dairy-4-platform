from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from schemas.video import VideoUploadResponse
from services.storage import store_video_upload

router = APIRouter()


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(video: UploadFile = File(...)) -> VideoUploadResponse:
    return await store_video_upload(video)