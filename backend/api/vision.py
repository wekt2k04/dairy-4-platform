from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from models.vision_inference import VisionProcessingError, VisionProcessingUnavailable, process_uploaded_video
from schemas.video import VisionProcessRequest, VisionProcessResponse, VideoUploadResponse
from services.storage import store_video_upload

router = APIRouter()


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(video: UploadFile = File(...)) -> VideoUploadResponse:
    return await store_video_upload(video)


@router.post("/process", response_model=VisionProcessResponse)
async def process_video(payload: VisionProcessRequest) -> VisionProcessResponse:
    try:
        result = await run_in_threadpool(process_uploaded_video, payload.video_url, payload.max_frames)
    except VisionProcessingUnavailable as exc:
        return VisionProcessResponse(
            original_video_url=payload.video_url,
            status="unavailable",
            error_message=str(exc),
        )
    except VisionProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return VisionProcessResponse(
        original_video_url=result.original_video_url,
        processed_video_url=result.processed_video_url,
        frames_processed=result.frames_processed,
        total_detections=result.total_detections,
        behavior_counts=result.behavior_counts,
        status="processed",
    )
