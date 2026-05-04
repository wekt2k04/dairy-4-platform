from fastapi import APIRouter

from api.auth import router as auth_router
from api.predict import router as predict_router
from api.vision import router as vision_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(predict_router, prefix="/predict", tags=["predict"])
api_router.include_router(vision_router, prefix="/vision", tags=["vision"])
