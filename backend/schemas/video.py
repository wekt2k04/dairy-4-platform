from fastapi import UploadFile
from pydantic import BaseModel, Field


class VideoUploadResponse(BaseModel):
    video_url: str
    filename: str


class VisionProcessRequest(BaseModel):
    video_url: str
    max_frames: int = Field(default=500, ge=1, le=5000)


class VisionProcessResponse(BaseModel):
    original_video_url: str
    processed_video_url: str | None = None
    frames_processed: int = Field(default=0, ge=0)
    total_detections: int = Field(default=0, ge=0)
    behavior_counts: dict[str, int] = Field(default_factory=dict)
    status: str = "processed"
    error_message: str | None = None


VideoUpload = UploadFile
