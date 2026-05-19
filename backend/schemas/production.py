from __future__ import annotations

from pydantic import BaseModel, Field
from schemas.health import HealthInput

class SimulationContext(BaseModel):
    """Contexte temporel et historique requis pour le LSTM"""
    milk_yesterday_liters: float = Field(..., ge=0, description="Production mesurée hier (L)")
    time_of_day_hhmm: str = Field(..., pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="Heure du relevé")

class ProductionInput(HealthInput, SimulationContext):
    """Fusion des données capteurs (IoT), santé et vision (YOLO/ViT)"""
    video_url: str | None = Field(default=None, description="URL de la séquence vidéo analysée")

class ProductionPredictionResponse(BaseModel):
    """Contrat de réponse pour le dashboard Dairy 4.0"""
    milk_yield_liters: float = Field(..., ge=0, description="Prédiction du volume (L)")
    drop_alert: bool = Field(..., description="Alerte si chute de production >= 15%")
    confidence_score: float = Field(..., ge=0, le=1, description="Indice de confiance du modèle")