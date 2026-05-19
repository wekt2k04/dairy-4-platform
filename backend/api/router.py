from fastapi import APIRouter

from api.anomaly import router as anomaly_router
from api.predict import router as predict_router
from api.realtime import router as realtime_router
from api.vision import router as vision_router
from api.ws import router as ws_router

api_router = APIRouter()
api_router.include_router(anomaly_router, prefix="/anomalies", tags=["anomalies"])
api_router.include_router(predict_router, prefix="/predict", tags=["predict"])
api_router.include_router(realtime_router, prefix="/realtime", tags=["realtime"])
api_router.include_router(vision_router, prefix="/vision", tags=["vision"])
api_router.include_router(ws_router, prefix="/ws", tags=["websocket"])
