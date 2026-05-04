from __future__ import annotations

from pydantic import BaseModel, Field

from schemas.health import HealthInput


class SimulationContext(BaseModel):
    milk_yesterday_liters: float = Field(ge=0)
    time_of_day_hhmm: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


class ProductionInput(HealthInput, SimulationContext):
    video_url: str | None = None


class ProductionPredictionResponse(BaseModel):
    milk_yield_liters: float = Field(ge=0)
    drop_alert: bool
    confidence_score: float = Field(ge=0, le=1)
