from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os

# CPU OPTIMIZATION: Set PyTorch thread limits before importing torch
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")

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
                import numpy as np

                model = joblib.load(artifact)
                features = [[payload.temperature_c, payload.heart_rate_bpm, payload.rumen_ph, payload.activity_score]]
                if hasattr(model, "predict_proba"):
                    probabilities = model.predict_proba(features)[0]
                    best_probability = float(np.max(probabilities))
                    best_index = int(np.argmax(probabilities))
                    status = ["Healthy", "Warning", "Critical"][min(best_index, 2)]
                    score = round(best_probability * 100.0, 2)
                    confidence = round(best_probability, 3)
                    return HealthPredictionResponse(health_status=status, health_score=score, confidence_score=confidence)
            except Exception:
                pass

        score, confidence, status = _health_score_from_inputs(payload)
        return HealthPredictionResponse(health_status=status, health_score=score, confidence_score=confidence)

    def predict_production(self, payload: ProductionInput) -> ProductionPredictionResponse:
        # Nouveaux chemins pour le modèle expert
        model_path = self.weights_dir / "dairy4_lstm_pro_attention.pt"
        feature_scaler_path = self.weights_dir / "dairy_feature_scaler.joblib"
        target_scaler_path = self.weights_dir / "dairy_target_scaler.joblib"

        if model_path.exists() and feature_scaler_path.exists() and target_scaler_path.exists():
            try:
                import torch
                import torch.nn as nn
                import numpy as np
                import joblib

                # 1. Définition locale de l'architecture pour isoler la dépendance PyTorch
                class Attention(nn.Module):
                    def __init__(self, hidden_dim):
                        super(Attention, self).__init__()
                        self.attention = nn.Linear(hidden_dim, 1, bias=False)

                    def forward(self, lstm_outputs):
                        attn_weights = torch.softmax(self.attention(lstm_outputs), dim=1)
                        context = torch.sum(attn_weights * lstm_outputs, dim=1)
                        return context

                class DairyExpertModel(nn.Module):
                    def __init__(self, input_size=9, hidden_size=128, num_layers=2):
                        super(DairyExpertModel, self).__init__()
                        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, bidirectional=True)
                        self.layer_norm = nn.LayerNorm(hidden_size * 2)
                        self.attention = Attention(hidden_size * 2)

                        self.fc_reg = nn.Sequential(
                            nn.Linear(hidden_size * 2, 64), nn.ReLU(), nn.Linear(64, 1)
                        )
                        self.fc_cls = nn.Sequential(
                            nn.Linear(hidden_size * 2, 64), nn.ReLU(), nn.Linear(64, 1)
                        )

                    def forward(self, x):
                        out, _ = self.lstm(x)
                        out = self.layer_norm(out)
                        context = self.attention(out)
                        return self.fc_reg(context), self.fc_cls(context)

                # 2. Chargement des poids et scalers
                device = torch.device("cpu")
                
                # CPU OPTIMIZATION: Set thread limits for better CPU performance
                torch.set_num_threads(2)
                if hasattr(torch, 'set_num_interop_threads'):
                    torch.set_num_interop_threads(1)
                
                feature_scaler = joblib.load(feature_scaler_path)
                target_scaler = joblib.load(target_scaler_path)

                model = DairyExpertModel(input_size=9, hidden_size=128, num_layers=2)
                model.load_state_dict(torch.load(model_path, map_location=device))
                model.to(device)
                model.eval()

                # 3. Préparation des données (Mocking de l'historique V1)
                temp = payload.temperature_c
                ph = payload.rumen_ph
                
                features_array = [
                    temp,
                    payload.heart_rate_bpm,
                    ph,
                    payload.activity_score,
                    150.0, # days_in_milk (valeur moyenne par défaut)
                    payload.milk_yesterday_liters,
                    temp,  # temp_roll_3d
                    ph,    # ph_roll_3d
                    0.0    # temp_std_3d
                ]

                # 4. Inférence LSTM
                sequence = np.array([features_array] * 14)
                seq_scaled = feature_scaler.transform(sequence)
                tensor_in = torch.tensor(seq_scaled, dtype=torch.float32).unsqueeze(0).to(device)

                with torch.no_grad():
                    yield_pred_scaled, drop_logit = model(tensor_in)

                # 5. Conversion des résultats
                yield_pred_real = target_scaler.inverse_transform(yield_pred_scaled.numpy())
                drop_prob = torch.sigmoid(drop_logit).item()

                is_alert = bool(drop_prob >= 0.50)
                predicted_yield = round(float(yield_pred_real[0][0]), 2)
                confidence = round(drop_prob if is_alert else 1.0 - drop_prob, 3)

                return ProductionPredictionResponse(
                    milk_yield_liters=predicted_yield,
                    drop_alert=is_alert,
                    confidence_score=confidence
                )

            except Exception as e:
                print(f"Erreur LSTM Inférence : {e}")
                pass # Si ça plante, on laisse le code continuer vers le fallback heuristique

        # Solution de repli heuristique si les fichiers manquent ou plantent
        predicted, confidence, drop_alert = _production_factor(payload)
        return ProductionPredictionResponse(milk_yield_liters=predicted, drop_alert=drop_alert, confidence_score=confidence)