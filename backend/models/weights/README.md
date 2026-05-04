# Data Science Drop-In Zone

Upload final trained artifacts here. The application will load them if they are present and fall back to deterministic heuristics when they are not.

## 1. Immediate Health Diagnostic Model

Place the trained artifact at `health_model.joblib`.

- Format: Scikit-learn pipeline or ensemble wrapped by `joblib`
- Required input columns: `temperature_c`, `heart_rate_bpm`, `rumen_ph`, `activity_score`
- Expected API outputs: `health_status`, `health_score`, `confidence_score`

## 2. Milk Production Forecasting Model

Place the trained artifact at `dairy4_lstm.pt`.

- Format: PyTorch `state_dict`
- Required architecture: 2-layer bidirectional LSTM, `hidden_size=128`, `input_size=18`
- Heads: independent linear heads named `fc_reg` and `fc_cls`
- Required wrapper input: `Float32` tensor with shape `(batch, 7, 18)`
- Preprocessing: `StandardScaler` fit on train split only
- Expected API outputs: `milk_yield_liters`, `drop_alert`

## 3. Vision Behavioral Model

The platform accepts a video upload and converts it to a URL for the inference wrapper. Pass the resolved video URL into your downstream vision pipeline.

## Operational Notes

- Do not add training code here.
- Keep artifacts immutable once promoted.
- If you replace an artifact, preserve the file name so the backend can hot-load it without code changes.