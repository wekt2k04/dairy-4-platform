# ML Models & Inference Engine

This directory contains the runtime inference entry points used by the backend.

## Active runtime behavior

- Health prediction is implemented in [inference.py](../models/inference.py).
- Vision prediction is implemented in [vision_inference.py](../models/vision_inference.py).
- The legacy loaders [health_loader.py](../models/health_loader.py) and [production_inference.py](../models/production_inference.py) are not wired into the current API path.

## Health inference

- Artifact: [weights/health_model.joblib](weights/health_model.joblib)
- Inputs: `temperature_c`, `heart_rate_bpm`, `rumen_ph`, `activity_score`
- Fallback: deterministic score/status if the artifact is missing or fails to load

## Production inference

- Artifacts: [weights/dairy4_lstm_pro_attention.pt](weights/dairy4_lstm_pro_attention.pt), [weights/dairy_feature_scaler.joblib](weights/dairy_feature_scaler.joblib), [weights/dairy_target_scaler.joblib](weights/dairy_target_scaler.joblib)
- Inputs: 9-feature temporal sequence built inside [inference.py](../models/inference.py)
- Fallback: deterministic yield estimate if the artifacts are missing or fail to load

## Vision inference

- Artifacts: [weights/yolo_cow_detector/best.pt](weights/yolo_cow_detector/best.pt) and [weights/vit_behavior_classifier](weights/vit_behavior_classifier)
- Runtime: CPU-only pipeline in [vision_inference.py](../models/vision_inference.py)
- Fallback: vision processing returns unavailable/error states instead of crashing the API
