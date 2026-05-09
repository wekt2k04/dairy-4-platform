# Data Science Drop-In Zone - Dairy 4.0

## 1. Modèle de Diagnostic de Santé (Heuristique/RF)
- **Fichier :** `health_model.joblib`
- [cite_start]**Colonnes :** `temperature_c`, `heart_rate_bpm`, `rumen_ph`, `activity_score` [cite: 2]

## 2. Modèle Expert de Prédiction Laitière (LSTM)
Ce modèle remplace l'ancienne version déterministe par une architecture Bi-LSTM avec mécanisme d'attention.

- **Fichiers requis :** - `dairy4_lstm_pro_attention.pt` (Poids du réseau)
  - `dairy_feature_scaler.joblib` (StandardScaler pour les 9 entrées)
  - `dairy_target_scaler.joblib` (MinMaxScaler pour la sortie liters)
- **Architecture :** Bi-LSTM 2 couches, `hidden_size=128`, 9 features d'entrée.
- **Features (9) :** - Capteurs : Temp, HR, pH, Activité.
  - Contexte : Days in Milk, Milk Yesterday.
  - Ingénierie : Temp Rolling Mean, pH Rolling Mean, Temp Std Dev.
- **Performances validées :** R² = 0.961 | F1-Score = 0.804.

## 3. Modèles de Vision
- **YOLO :** `yolo_cow_detector/best.pt`
- **ViT :** `vit_behavior_classifier/`