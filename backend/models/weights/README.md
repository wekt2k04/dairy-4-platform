# Model Weights

This folder stores the model artifacts consumed by the current backend runtime.

## Files that are actually used

- `health_model.joblib`
- `dairy4_lstm_pro_attention.pt`
- `dairy_feature_scaler.joblib`
- `dairy_target_scaler.joblib`
- `yolo_cow_detector/best.pt`
- `vit_behavior_classifier/`

## Notes

- The backend loads these files from `MODEL_WEIGHTS_DIR`, which defaults to this directory.
- `vit_behavior_classifier_version2/` exists in the repository but is not referenced by the current runtime path.
- If you replace any artifact, keep the same filename or update the loader in [backend/models/inference.py](../../models/inference.py) or [backend/models/vision_inference.py](../../models/vision_inference.py).