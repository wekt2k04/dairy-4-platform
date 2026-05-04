from fastapi import UploadFile
from pydantic import BaseModel


class VideoUploadResponse(BaseModel):
	video_url: str
	filename: str


VideoUpload = UploadFile
