from __future__ import annotations

from pydantic import BaseModel, Field


class HealthInput(BaseModel):
    temperature_c: float = Field(ge=35, le=43)
    heart_rate_bpm: int = Field(ge=20, le=150)
    rumen_ph: float = Field(ge=4.0, le=8.0)
    activity_score: int = Field(ge=0, le=100)


class HealthPredictionResponse(BaseModel):
    health_status: str
    health_score: float = Field(ge=0, le=100)
    confidence_score: float = Field(ge=0, le=1)
