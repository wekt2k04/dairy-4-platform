import torch
import torch.nn as nn
import joblib
import numpy as np
from pathlib import Path

# --- 1. CONFIGURATION DE LA DROP ZONE ---
CURRENT_DIR = Path(__file__).resolve().parent
WEIGHTS_DIR = CURRENT_DIR / "weights"
MODEL_PATH = WEIGHTS_DIR / "dairy4_lstm.pt"
SCALER_PATH = WEIGHTS_DIR / "dairy_scaler.joblib"

# --- 2. DÉFINITION DE L'ARCHITECTURE (Copiée de ton pipeline) ---
class DairyLSTM(nn.Module):
    def __init__(self, input_size=6, hidden_size=32, num_layers=2):
        super(DairyLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        # Tête de régression : Prédiction des litres de lait
        self.fc_reg = nn.Linear(hidden_size, 1)
        # Tête de classification : Alerte de chute (Probabilité)
        self.fc_cls = nn.Sequential(
            nn.Linear(hidden_size, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_step = lstm_out[:, -1, :] # On prend le dernier jour de la séquence
        yield_pred = self.fc_reg(last_step)
        drop_prob = self.fc_cls(last_step)
        return yield_pred, drop_prob

# --- 3. LE MOTEUR D'INFÉRENCE (Singleton) ---
class ProductionInferenceEngine:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._load_assets()

    def _load_assets(self):
        """Charge le scaler et le modèle en mémoire."""
        if not SCALER_PATH.exists() or not MODEL_PATH.exists():
            raise FileNotFoundError(f"Modèle ou Scaler introuvable dans la Drop Zone : {WEIGHTS_DIR}")
        
        # Chargement du scaler Scikit-learn
        self.scaler = joblib.load(SCALER_PATH)
        
        # Chargement de PyTorch
        self.model = DairyLSTM(input_size=6, hidden_size=32, num_layers=2)
        self.model.load_state_dict(torch.load(MODEL_PATH, map_location=self.device))
        self.model.to(self.device)
        self.model.eval() # Mode inférence (désactive le dropout/batchnorm)

    def _parse_time(self, time_str: str) -> float:
        """Convertit '14:30' en 14.5 pour le modèle."""
        hours, minutes = map(int, time_str.split(':'))
        return hours + (minutes / 60.0)

    def predict(self, data_dict: dict) -> dict:
        """Prépare les données, simule l'historique et fait la prédiction."""
        # 1. Extraction et formatage du jour actuel
        current_day_features = [
            data_dict['temperature_c'],
            data_dict['heart_rate_bpm'],
            data_dict['rumen_ph'],
            data_dict['activity_score'],
            data_dict['milk_yesterday_liters'],
            self._parse_time(data_dict['time_of_day_hhmm'])
        ]
        
        # 2. Construction de la séquence de 7 jours (seq_length=7)
        # TODO: Dans la V2, il faudra fetcher les 6 vrais jours précédents en Base de Données.
        # Pour la V1, on duplique la donnée d'aujourd'hui pour créer un historique plat.
        sequence = np.array([current_day_features] * 7) # Forme: (7, 6)
        
        # 3. Normalisation (Le scaler attend du 2D, on aplatit puis on redimensionne)
        sequence_scaled = self.scaler.transform(sequence)
        
        # 4. Conversion en Tenseur PyTorch avec batch (1, 7, 6)
        tensor_in = torch.tensor(sequence_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
        
        # 5. Prédiction
        with torch.no_grad():
            yield_pred, drop_prob = self.model(tensor_in)
            
        yield_val = yield_pred.item()
        prob_val = drop_prob.item()

        return {
            "milk_yield_liters": round(yield_val, 2),
            "drop_alert": prob_val > 0.5, # Seuil de déclenchement à 50%
            "confidence_score": round(prob_val if prob_val > 0.5 else 1 - prob_val, 2)
        }

# Instance globale (Singleton)
_ENGINE = None

def get_production_engine() -> ProductionInferenceEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = ProductionInferenceEngine()
    return _ENGINE