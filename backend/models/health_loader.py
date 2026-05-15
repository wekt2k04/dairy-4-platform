"""
Chargeur optimisé pour le modèle de prédiction de santé bovine.
Corrige les erreurs du code initial et suit les meilleures pratiques.
"""

import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Any


class HealthModelLoader:
    """Gestionnaire singleton pour charger et utiliser le modèle de santé."""
    
    _instance = None
    _model = None
    
    # Configuration des features dans le bon ordre
    FEATURE_NAMES = ["temperature_c", "heart_rate_bpm", "rumen_ph", "activity_score"]
    MODEL_CLASSES = ["Healthy", "Warning", "Critical"]  # Ordre doit correspondre au training
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialise le chargeur (Singleton)."""
        if self._model is None:
            self._load_model()
    
    def _load_model(self):
        """Charge le modèle depuis le fichier .joblib."""
        model_path = Path(__file__).parent / "weights" / "health_model.joblib"
        
        if not model_path.exists():
            raise FileNotFoundError(f"Modèle non trouvé: {model_path}")
        
        try:
            # ✅ Chargement direct du modèle (pas de bundle dict)
            self._model = joblib.load(model_path)
            print(f"✅ Modèle chargé avec succès de {model_path}")
        except Exception as e:
            raise RuntimeError(f"❌ Erreur lors du chargement du modèle: {e}")
    
    def predict_health(
        self,
        temperature_c: float,
        heart_rate_bpm: int,
        rumen_ph: float,
        activity_score: int
    ) -> Dict[str, Any]:
        """
        Prédit l'état de santé avec le modèle ML.
        
        Args:
            temperature_c: Température corporelle (35-43°C)
            heart_rate_bpm: Fréquence cardiaque (20-150 bpm)
            rumen_ph: pH du rumen (4.0-8.0)
            activity_score: Score d'activité (0-100)
            
        Returns:
            Dict avec {health_status, health_score, confidence, probabilities}
        """
        
        # ✅ Création du DataFrame avec les bonnes colonnes
        features_array = np.array([[
            temperature_c,
            heart_rate_bpm,
            rumen_ph,
            activity_score
        ]])
        
        # Prédiction
        prediction_idx = self._model.predict(features_array)[0]
        
        # ✅ Extraction correcte des probabilités
        if hasattr(self._model, "predict_proba"):
            probabilities = self._model.predict_proba(features_array)[0]
            
            # ✅ Utiliser argmax au lieu de .index() (bug numpy)
            best_idx = np.argmax(probabilities)
            best_probability = probabilities[best_idx]
            
            health_status = self.MODEL_CLASSES[best_idx]
            health_score = round(float(best_probability * 100.0), 2)
            confidence = round(float(best_probability), 3)
            
            # Retourner tous les scores de probabilité
            prob_dict = {
                cls: round(float(prob), 3)
                for cls, prob in zip(self.MODEL_CLASSES, probabilities)
            }
        else:
            raise ValueError("❌ Le modèle n'a pas la méthode predict_proba")
        
        return {
            "health_status": health_status,
            "health_score": health_score,
            "confidence": confidence,
            "probabilities": prob_dict
        }


# Instance globale
_loader = None

def get_health_loader() -> HealthModelLoader:
    """Retourne l'instance singleton du chargeur."""
    global _loader
    if _loader is None:
        _loader = HealthModelLoader()
    return _loader


# --- TESTS ---
if __name__ == "__main__":
    loader = get_health_loader()
    
    # Test avec des valeurs de bovins sains
    result = loader.predict_health(
        temperature_c=38.5,
        heart_rate_bpm=65,
        rumen_ph=6.2,
        activity_score=75
    )
    print("✅ Prédiction (Sain):", result)
    
    # Test avec des valeurs d'alerte
    result = loader.predict_health(
        temperature_c=40.5,  # Fièvre
        heart_rate_bpm=95,
        rumen_ph=5.0,
        activity_score=45
    )
    print("⚠️  Prédiction (Alerte):", result)
