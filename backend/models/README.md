# ML Models & Inference Engine

This document details the architecture, tensor contracts, and operational behavior of the three independent machine learning models that power Dairy 4.0.

---

## Model Architecture Overview

| Model | Framework | Purpose | Decoupling |
|-------|-----------|---------|-----------|
| **Health** | Scikit-Learn (Classifier) | Classify cow health status | Always runs |
| **Production** | PyTorch (LSTM+Attention) | Predict milk yield | Always runs |
| **Vision** | YOLO v8 + Vision Transformer | Detect behavior & anomalies | Runs only if `video_url` provided |

### Key Design Principle: Complete Independence

Each model operates independently:
- **No cascading failures:** If one model loads/runs, others are unaffected.
- **No shared state:** Models do not depend on each other's outputs as inputs.
- **Graceful degradation:** If a model unavailable, its service falls back to deterministic heuristics.

---

## 1. Health Model (Scikit-Learn Classifier)

### Overview
Binary or multi-class classifier that assesses cow health status based on vital signs.

### Artifact Location
```
backend/models/weights/health_model.joblib
```

### Expected Input Tensor

**Shape:** `(1, 4)` or equivalent 2D tabular format.

**Feature order (4 features):**
| Index | Feature | Type | Range | Example |
|-------|---------|------|-------|---------|
| 0 | `temperature_c` | float | 37–41 | 38.8 |
| 1 | `heart_rate_bpm` | float | 50–120 | 75 |
| 2 | `rumen_ph` | float | 5.5–8.0 | 6.8 |
| 3 | `activity_score` | float | 0–100 | 65 |

### Expected Output

```json
{
  "health_status": "Healthy",     // or "Warning", "Critical"
  "health_score": 0.85,            // 0–1 confidence
  "confidence_score": 0.92         // model prediction certainty
}
```

### Class Labels
- `Healthy` — Cow requires no intervention.
- `Warning` — Elevated risk; recommend monitoring.
- `Critical` — Immediate veterinary attention required.

### Loading & Fallback

**Canonical load path:**
```python
import joblib
health_model = joblib.load("backend/models/weights/health_model.joblib")
```

**Fallback heuristic** (if model unavailable):
```python
# Rule-based health assessment
if temperature < 37.5 or temperature > 39.5:
    status = "Warning"
elif heart_rate > 100 or heart_rate < 40:
    status = "Warning"
else:
    status = "Healthy"
```

---

## 2. Production Model (PyTorch LSTM + Attention)

### Overview
Time-series LSTM with attention mechanism that predicts milk yield and production anomalies.

### Artifact Locations
```
backend/models/weights/dairy4_lstm_pro_attention.pt   # Model weights
backend/models/weights/dairy_feature_scaler.joblib    # Input normalizer
backend/models/weights/dairy_target_scaler.joblib     # Output denormalizer
```

### Expected Input Tensor

**Shape:** `(batch, sequence_length=14, features=9)`

**Example:** Batch of 1 cow with 14 days of historical data:
```
Input: torch.Tensor shape (1, 14, 9)
```

**Feature order (9 features in temporal sequence):**
| Idx | Feature | Type | Purpose |
|-----|---------|------|---------|
| 0 | `temperature_c` | float | Real-time vital |
| 1 | `heart_rate_bpm` | float | Real-time vital |
| 2 | `rumen_ph` | float | Digestive health |
| 3 | `activity_score` | float | Behavioral metric |
| 4 | `days_in_milk` | float | Lactation cycle |
| 5 | `milk_yesterday_liters` | float | Prior yield |
| 6 | `temp_roll_3d` | float | 3-day rolling avg |
| 7 | `ph_roll_3d` | float | 3-day rolling avg |
| 8 | `temp_std_3d` | float | 3-day volatility |

### Input Preparation

1. **Collect 14 days** of historical sensor readings.
2. **Normalize each feature** using `dairy_feature_scaler` (StandardScaler from Scikit-Learn).
3. **Stack features** in temporal order → shape `(14, 9)`.
4. **Add batch dimension** → shape `(1, 14, 9)`.

```python
import torch
import joblib

feature_scaler = joblib.load("backend/models/weights/dairy_feature_scaler.joblib")
target_scaler = joblib.load("backend/models/weights/dairy_target_scaler.joblib")

# Normalize raw features
features_normalized = feature_scaler.transform(raw_features)  # (14, 9)

# Convert to tensor and add batch
tensor_input = torch.FloatTensor(features_normalized).unsqueeze(0)  # (1, 14, 9)

# Forward pass
output = model(tensor_input)  # shape (1, 1)

# Denormalize output
milk_yield = target_scaler.inverse_transform(output.detach().numpy())
```

### Expected Output

```json
{
  "milk_yield_liters": 28.5,       // Predicted daily yield
  "drop_alert": false,              // Anomaly flag
  "confidence_score": 0.87          // Prediction confidence
}
```

### Model Architecture Notes
- **Type:** LSTM with self-attention over sequence.
- **Input size:** 9 (features per timestep).
- **Hidden size:** Typically 64–128.
- **Sequence length:** 14 days (fixed).
- **Output size:** 1 (milk yield in liters).

### Loading & Fallback

**Canonical load path:**
```python
import torch

model = torch.load("backend/models/weights/dairy4_lstm_pro_attention.pt")
model.eval()  # Inference mode
```

**Fallback heuristic** (if model unavailable):
```python
# Deterministic yield estimation
base_yield = 25.0  # Liters
temp_adjustment = (temperature - 38.5) * 0.5
activity_boost = (activity_score / 100) * 3.0
predicted_yield = base_yield + temp_adjustment + activity_boost
```

---

## 3. Vision Model (YOLO v8 + Vision Transformer)

### Overview
Multi-stage pipeline that detects cows, crops regions of interest, and classifies behavior.

### Artifact Locations
```
backend/models/weights/yolo_cow_detector/best.pt              # YOLO v8 detector
backend/models/weights/vit_behavior_classifier/               # Vision Transformer (Hugging Face format)
  ├── config.json
  ├── pytorch_model.bin
  └── preprocessor_config.json
```

### Stage 1: Detection (YOLO)

**Input:** Video frame (H × W × 3 RGB).

**Output:** Bounding boxes + confidence scores.

```python
import torch
from ultralytics import YOLO

yolo = YOLO("backend/models/weights/yolo_cow_detector/best.pt")
results = yolo(frame)  # Detect cows in frame

for result in results:
    boxes = result.boxes  # Detected bounding boxes
    for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0]
        confidence = box.conf[0]
        # Crop region
        roi = frame[int(y1):int(y2), int(x1):int(x2)]
```

### Stage 2: Classification (Vision Transformer)

**Input:** Cropped cow region, resized to 224×224 RGB.

**Expected shape:** `(224, 224, 3)` or batch `(B, 3, 224, 224)`.

**Output:** Behavior classification + confidence.

```python
from transformers import ViTImageProcessor, ViTForImageClassification
from PIL import Image

processor = ViTImageProcessor.from_pretrained("backend/models/weights/vit_behavior_classifier")
model = ViTForImageClassification.from_pretrained("backend/models/weights/vit_behavior_classifier")

# Preprocess
inputs = processor(Image.fromarray(roi), return_tensors="pt")
outputs = model(**inputs)
logits = outputs.logits
predicted_class = logits.argmax(-1).item()
```

### Behavior Classes

| Label | Description |
|-------|-------------|
| `drinking_water` | Cow at water trough |
| `foraging` | Eating hay/grass |
| `lying_down` | Recumbent position |
| `rumination` | Chewing cud while standing |
| `standing_idle` | Upright, not foraging |

### Expected Output

```json
{
  "detections": [
    {
      "box": { "x1": 100, "y1": 150, "x2": 300, "y2": 400 },
      "confidence": 0.95,
      "behavior": "rumination",
      "behavior_confidence": 0.88
    }
  ],
  "summary": "2 cows detected; 1 ruminating, 1 standing_idle"
}
```

### Loading & Fallback

**Canonical load paths:**
```python
# YOLO
from ultralytics import YOLO
yolo = YOLO("backend/models/weights/yolo_cow_detector/best.pt")

# ViT
from transformers import ViTForImageClassification, ViTImageProcessor
processor = ViTImageProcessor.from_pretrained("backend/models/weights/vit_behavior_classifier")
vit = ViTForImageClassification.from_pretrained("backend/models/weights/vit_behavior_classifier")
```

**Fallback behavior** (if video unavailable or models missing):
- **No video provided:** Vision block is skipped entirely; health + production still run.
- **Model loading fails:** Return `{ "status": "unavailable", "reason": "Model assets not found" }`.
- **Runtime error during inference:** Catch exception, return `{ "status": "error", "reason": "..." }`.

---

## 4. Unified Prediction Orchestration

### Endpoint
```
POST /api/predict/full-simulation
```

### Request Payload
```json
{
  "temperature_c": 38.5,
  "heart_rate_bpm": 72,
  "rumen_ph": 6.8,
  "activity_score": 70,
  "days_in_milk": 45,
  "milk_yesterday_liters": 28.0,
  "video_url": "https://example.com/video.mp4"  // Optional
}
```

### Execution Order

1. **Health** (threadpool, non-blocking)
2. **Production** (threadpool, non-blocking)
3. **Vision** (threadpool, if `video_url` provided)
4. **Await all** and consolidate results.
5. **Write to Firestore** with timestamp.

### Response Payload
```json
{
  "prediction_id": "uuid-here",
  "timestamp": "2024-01-15T10:30:00Z",
  "inputs": { /* echoed input fields */ },
  "health": { /* health model output */ },
  "production": { /* production model output */ },
  "vision": { /* vision output or null */ }
}
```

---

## 5. Error Handling & Fallbacks

| Failure Scenario | Behavior |
|------------------|----------|
| Health model missing | Use heuristic; return result with `confidence_score: 0.5` |
| Production model missing | Use heuristic; return result with `confidence_score: 0.5` |
| Vision model missing (but video provided) | Skip vision; return `{ "status": "unavailable" }` |
| No video provided | Skip vision entirely; return empty vision block |
| Firestore write fails | Log error; return predictions to frontend anyway |
| Tensor shape mismatch | Reshape or pad; log warning |

---

## 6. Development & Testing

### Loading Models Locally
```python
import joblib
import torch
from transformers import ViTImageProcessor, ViTForImageClassification
from ultralytics import YOLO

health = joblib.load("backend/models/weights/health_model.joblib")
lstm = torch.load("backend/models/weights/dairy4_lstm_pro_attention.pt")
yolo = YOLO("backend/models/weights/yolo_cow_detector/best.pt")
vit_processor = ViTImageProcessor.from_pretrained("backend/models/weights/vit_behavior_classifier")
vit = ViTForImageClassification.from_pretrained("backend/models/weights/vit_behavior_classifier")
```

### Unit Test Template
```python
import numpy as np
import torch

def test_health_model():
    test_input = np.array([[38.8, 75, 6.8, 65]])  # (1, 4)
    output = health_model.predict(test_input)
    assert output in ["Healthy", "Warning", "Critical"]

def test_production_model():
    test_input = torch.randn(1, 14, 9)  # (batch, seq, features)
    output = lstm(test_input)
    assert output.shape == (1, 1)
    assert output.item() > 0  # Milk yield must be positive

def test_vision_model():
    # Simulate frame and YOLO detection
    frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    results = yolo(frame)
    assert len(results[0].boxes) > 0
```

---

## 7. Maintenance & Retraining

### Versioning
When retraining a model:
1. Save new artifact with version suffix: `health_model_v2.joblib`.
2. Update code to load `v2` while keeping `v1` as fallback.
3. Coordinate with frontend deployment to avoid mismatches.

### Monitoring
- Log inference latency per model.
- Track fallback usage (indicates model loading issues).
- Monitor Firestore write success rate.

---

## References

- **Scikit-Learn joblib:** https://scikit-learn.org/stable/modules/model_persistence.html
- **PyTorch saving/loading:** https://pytorch.org/tutorials/beginner/saving_loading_models.html
- **YOLO v8:** https://docs.ultralytics.com/
- **Hugging Face ViT:** https://huggingface.co/transformers/model_doc/vit.html
