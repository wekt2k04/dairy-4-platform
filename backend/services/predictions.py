from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import UploadFile
from fastapi.concurrency import run_in_threadpool

from models.inference import DairyInferenceEngine
from models.vision_inference import VisionProcessingError, VisionProcessingUnavailable, process_uploaded_video
from schemas.health import HealthInput, HealthPredictionResponse
from schemas.production import ProductionInput, ProductionPredictionResponse
from schemas.simulation import FullSimulationInput, FullSimulationResponse
from schemas.video import VisionProcessResponse
from services.firestore import write_prediction_record
from services.storage import store_video_upload

engine = DairyInferenceEngine()


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def predict_health(payload: HealthInput) -> HealthPredictionResponse:
    result = engine.predict_health(payload)
    write_prediction_record("health_predictions", {**payload.model_dump(), **result.model_dump()})
    return result


async def predict_milk_production(payload: ProductionInput, video: UploadFile | None = None) -> ProductionPredictionResponse:
    if video is not None:
        stored = await store_video_upload(video)
        payload.video_url = stored.video_url

    result = await run_in_threadpool(engine.predict_production, payload)
    write_prediction_record("production_predictions", {**payload.model_dump(), **result.model_dump()})
    return result


async def run_full_simulation(payload: FullSimulationInput) -> FullSimulationResponse:
    health = await run_in_threadpool(engine.predict_health, payload)
    production = await run_in_threadpool(engine.predict_production, payload)

    vision: VisionProcessResponse | None = None
    if payload.video_url:
        try:
            processed = await run_in_threadpool(process_uploaded_video, payload.video_url)
            vision = VisionProcessResponse(
                original_video_url=processed.original_video_url,
                processed_video_url=processed.processed_video_url,
                frames_processed=processed.frames_processed,
                total_detections=processed.total_detections,
                behavior_counts=processed.behavior_counts,
                status="processed",
            )
        except VisionProcessingUnavailable as exc:
            vision = VisionProcessResponse(
                original_video_url=payload.video_url,
                status="unavailable",
                error_message=str(exc),
            )
        except VisionProcessingError as exc:
            vision = VisionProcessResponse(
                original_video_url=payload.video_url,
                status="error",
                error_message=str(exc),
            )

    prediction_id = uuid4().hex
    response = FullSimulationResponse(
        prediction_id=prediction_id,
        created_at=_utc_timestamp(),
        source="api",
        inputs=payload,
        health=health,
        production=production,
        vision=vision,
        firestore_path=f"predictions/{prediction_id}",
    )

    write_prediction_record("predictions", response.model_dump(mode="json"), document_id=prediction_id)
    return response
