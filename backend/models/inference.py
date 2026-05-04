from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from core.config import get_backend_settings
from schemas.health import HealthInput, HealthPredictionResponse
from schemas.production import ProductionInput, ProductionPredictionResponse


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _health_score_from_inputs(payload: HealthInput) -> tuple[float, float, str]:
    temperature_penalty = abs(payload.temperature_c - 38.5) * 11.5
    heart_penalty = abs(payload.heart_rate_bpm - 70) * 0.28
    ph_penalty = abs(payload.rumen_ph - 6.2) * 13.5
    activity_penalty = abs(payload.activity_score - 72) * 0.22

    score = 100.0 - (temperature_penalty + heart_penalty + ph_penalty + activity_penalty)
    score = round(_clamp(score, 0.0, 100.0), 2)

    if score >= 75:
        status = "Healthy"
    elif score >= 45:
        status = "Warning"
    else:
        status = "Critical"

    confidence = round(_clamp(0.55 + (score / 100.0) * 0.4, 0.55, 0.98), 3)
    return score, confidence, status


def _production_factor(payload: ProductionInput) -> tuple[float, float, bool]:
    score, _, _ = _health_score_from_inputs(payload)
    baseline = payload.milk_yesterday_liters
    time_hour = int(payload.time_of_day_hhmm.split(":")[0])

    time_factor = 0.98 if time_hour < 10 else 0.95 if time_hour < 16 else 0.92
    health_factor = 0.75 + (score / 100.0) * 0.25
    rumen_factor = 1.0 - abs(payload.rumen_ph - 6.2) * 0.03
    activity_factor = 1.0 - abs(payload.activity_score - 72) * 0.0015

    predicted = baseline * time_factor * health_factor * rumen_factor * activity_factor
    predicted = round(_clamp(predicted, 0.0, baseline * 1.12 if baseline else 0.0), 2)
    drop_alert = bool(baseline and predicted <= baseline * 0.85)
    confidence = round(_clamp(0.58 + (score / 100.0) * 0.34, 0.58, 0.96), 3)
    return predicted, confidence, drop_alert


@dataclass(slots=True)
class DairyInferenceEngine:
    settings: dict[str, object] | None = None

    def __post_init__(self) -> None:
        if self.settings is None:
            self.settings = get_backend_settings()

    @property
    def weights_dir(self) -> Path:
        return Path(str(self.settings["model_weights_dir"]))

    def predict_health(self, payload: HealthInput) -> HealthPredictionResponse:
        artifact = self.weights_dir / "health_model.joblib"
        if artifact.exists():
            try:
                import joblib

                model = joblib.load(artifact)
                features = [[payload.temperature_c, payload.heart_rate_bpm, payload.rumen_ph, payload.activity_score]]
                if hasattr(model, "predict_proba"):
                    probabilities = model.predict_proba(features)[0]
                    best_probability = max(probabilities)
                    best_index = probabilities.index(best_probability)
                    status = ["Healthy", "Warning", "Critical"][min(best_index, 2)]
                    score = round(float(best_probability * 100.0), 2)
                    confidence = round(float(best_probability), 3)
                    return HealthPredictionResponse(health_status=status, health_score=score, confidence_score=confidence)
            except Exception:
                pass

        score, confidence, status = _health_score_from_inputs(payload)
        return HealthPredictionResponse(health_status=status, health_score=score, confidence_score=confidence)

    def predict_production(self, payload: ProductionInput) -> ProductionPredictionResponse:
        artifact = self.weights_dir / "dairy4_lstm.pt"
        if artifact.exists():
            try:
                import torch

                _state_dict = torch.load(artifact, map_location="cpu")
                _ = _state_dict
            except Exception:
                pass

        predicted, confidence, drop_alert = _production_factor(payload)
        return ProductionPredictionResponse(milk_yield_liters=predicted, drop_alert=drop_alert, confidence_score=confidence)