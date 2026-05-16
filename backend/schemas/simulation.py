from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from schemas.health import HealthPredictionResponse
from schemas.production import ProductionInput, ProductionPredictionResponse
from schemas.video import VisionProcessResponse


class FullSimulationInput(ProductionInput):
    """Unified payload for health, production, and optional vision inference."""


class FullSimulationResponse(BaseModel):
    prediction_id: str = Field(min_length=1)
    created_at: str = Field(min_length=1)
    source: Literal["api", "firestore"] = "api"
    inputs: ProductionInput
    health: HealthPredictionResponse
    production: ProductionPredictionResponse
    vision: VisionProcessResponse | None = None
    firestore_path: str | None = None
