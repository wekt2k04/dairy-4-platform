from __future__ import annotations

from fastapi import UploadFile

from models.inference import DairyInferenceEngine
from schemas.health import HealthInput, HealthPredictionResponse
from schemas.production import ProductionInput, ProductionPredictionResponse
from services.firestore import write_prediction_record
from services.storage import store_video_upload

engine = DairyInferenceEngine()


def predict_health(payload: HealthInput) -> HealthPredictionResponse:
    result = engine.predict_health(payload)
    write_prediction_record("health_predictions", {**payload.model_dump(), **result.model_dump()})
    return result


async def predict_milk_production(payload: ProductionInput, video: UploadFile | None = None) -> ProductionPredictionResponse:
    if video is not None:
        stored = await store_video_upload(video)
        payload.video_url = stored.video_url

    result = engine.predict_production(payload)
    write_prediction_record("production_predictions", {**payload.model_dump(), **result.model_dump()})
    return result