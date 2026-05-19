# AUDIT_REPORT_FOR_LLM.md

Date: 2026-05-19
Workspace: dairy-4-platform

## 1. ML Model Footprint & Memory Requirements

### 1.1 Artifact locations and exact sizes
Source folder: backend/models/weights

| Artifact | Path (repo-relative) | Size (bytes) | Size (MiB) |
| --- | --- | ---:| ---:|
| LSTM production weights | backend/models/weights/dairy4_lstm_pro_attention.pt | 2,292,355 | 2.19 |
| LSTM feature scaler | backend/models/weights/dairy_feature_scaler.joblib | 1,215 | 0.00 |
| LSTM target scaler | backend/models/weights/dairy_target_scaler.joblib | 991 | 0.00 |
| Health model | backend/models/weights/health_model.joblib | 7,413,220 | 7.07 |
| YOLO detector | backend/models/weights/yolo_cow_detector/best.pt | 5,445,402 | 5.19 |
| ViT config | backend/models/weights/vit_behavior_classifier/config.json | 881 | 0.00 |
| ViT weights | backend/models/weights/vit_behavior_classifier/model.safetensors | 343,233,204 | 327.33 |
| ViT preprocessor | backend/models/weights/vit_behavior_classifier/preprocessor_config.json | 364 | 0.00 |
| ViT directory total | backend/models/weights/vit_behavior_classifier | 343,239,650 | 327.34 |

Total model artifacts listed above (including scalers + ViT directory total): 358,392,833 bytes (341.83 MiB).

### 1.2 Inference entry points and runtime characteristics

Primary inference entry points used by the API:
- backend/models/inference.py -> DairyInferenceEngine
  - Health ML model: health_model.joblib (joblib + sklearn)
  - Production ML model: dairy4_lstm_pro_attention.pt + dairy_feature_scaler.joblib + dairy_target_scaler.joblib
  - Device: CPU only (torch.device("cpu"))

- backend/models/vision_inference.py -> CowVisionInference
  - YOLO: yolo_cow_detector/best.pt (ultralytics)
  - ViT: vit_behavior_classifier/* (transformers)
  - Device: CPU only (self.device = "cpu")
  - Runtime optimizations: OMP_NUM_THREADS=2, MKL_NUM_THREADS=2, torch.set_num_threads(2)
  - Frame skipping: processes 1 of every 10 frames, downscales to max 640px on longest edge

Legacy/unused inference file (not referenced in API paths):
- backend/models/production_inference.py -> ProductionInferenceEngine
  - Uses weights dairy4_lstm.pt and dairy_scaler.joblib (not used by current API code)
  - Device: cuda if available, else cpu

### 1.3 RAM / VRAM estimation (heuristic)

Observed from code:
- All active model inference is forced to CPU.
- No explicit GPU usage in the active inference engines.

Heuristic memory estimate for simultaneous model load (YOLO + ViT + LSTM + joblib model):
- Raw weights on disk: ~341.83 MiB total
- In-memory footprint typically 1.5x to 3x weights for PyTorch + transformers + activations
- Estimated steady-state RAM after load: ~0.7 GiB to ~1.2 GiB
- Estimated peak RAM during inference (video processing + activations + buffers): ~1.0 GiB to ~1.8 GiB

Fit assessment for 16 GiB free-tier limit:
- Yes, expected to fit with substantial headroom, even with video processing buffers.

VRAM estimate:
- 0 GiB required by default (CPU-only paths in active code).

Notes on variability:
- Vision pipeline processes frames and crops; memory scales with input resolution and number of detections.
- OpenCV video buffers and image copies can add tens to hundreds of MiB during processing.

### 1.4 Heavy dependency versions (from backend/requirements.txt)

Pinned or constrained versions:
- torch >=2.2.0,<3.0.0
- ultralytics >=8.3.0,<9.0.0
- transformers >=4.40.0,<5.0.0
- opencv-python >=4.9.0,<5.0.0
- scikit-learn >=1.4.0,<2.0.0
- joblib ==1.4.2
- pillow >=10.0.0,<12.0.0
- safetensors >=0.4.0,<1.0.0
- imageio-ffmpeg >=0.5.0,<1.0.0

### 1.5 Heuristic fallbacks / degraded mode behavior

Health prediction fallback (missing model or load failure):
Source: backend/models/inference.py
- If health_model.joblib missing or joblib load fails -> heuristic scoring is used.

Production prediction fallback (missing model or load failure):
Source: backend/models/inference.py
- If dairy4_lstm_pro_attention.pt or scalers missing -> heuristic scoring is used.
- If any exception occurs during LSTM inference -> heuristic scoring is used.

Vision pipeline fallback (missing files or missing dependencies):
Source: backend/models/vision_inference.py
- If YOLO or ViT files are missing -> VisionProcessingUnavailable is raised.
- If a dependency (cv2, torch, transformers, ultralytics) is missing -> VisionProcessingUnavailable is raised.
- In full simulation, VisionProcessingUnavailable returns a response with status="unavailable" (no crash).
- For the /api/vision/process endpoint, VisionProcessingUnavailable returns status="unavailable".

Backend startup behavior:
Source: backend/main.py
- Model preload failures are caught; server continues and loads models lazily on first request.

Representative code snippets (trimmed):

backend/models/inference.py
```
artifact = self.weights_dir / "health_model.joblib"
if artifact.exists():
    try:
        model = joblib.load(artifact)
        ...
        return HealthPredictionResponse(...)
    except Exception:
        pass
# fallback
score, confidence, status = _health_score_from_inputs(payload)
```

backend/models/inference.py
```
if model_path.exists() and feature_scaler_path.exists() and target_scaler_path.exists():
    try:
        ...
        model.load_state_dict(torch.load(model_path, map_location=device))
        ...
        return ProductionPredictionResponse(...)
    except Exception as e:
        print(f"Erreur LSTM Inférence : {e}")
        pass
# fallback
predicted, confidence, drop_alert = _production_factor(payload)
```

backend/models/vision_inference.py
```
if not YOLO_MODEL_PATH.exists():
    raise VisionProcessingUnavailable(...)
if not VIT_MODEL_DIR.exists():
    raise VisionProcessingUnavailable(...)
```

backend/main.py
```
try:
    from models.vision_inference import get_vision_engine
    from models.inference import DairyInferenceEngine
    vision_engine = get_vision_engine()
    inference_engine = DairyInferenceEngine()
except Exception as e:
    print(f"[WARN] Could not pre-load models on startup: {e}")
```

## 2. Firebase & Firestore Integration Surface

### 2.1 Backend initialization (Firebase Admin SDK)

Source: backend/core/config.py
- FIREBASE_PROJECT_ID
- GOOGLE_APPLICATION_CREDENTIALS

Source: backend/core/firebase_admin.py
- initialize_firebase_admin() reads the env vars above and initializes firebase-admin
- It uses credentials.Certificate(credentials_path); the service account key must be available as a file at GOOGLE_APPLICATION_CREDENTIALS
- If firebase-admin is missing or credentials are not set, it logs and returns None

### 2.2 Frontend Firebase SDK usage

Source: frontend/src/services/firebase.ts
- Uses Firebase JS SDK directly
- Config keys required:
  - VITE_FIREBASE_API_KEY
  - VITE_FIREBASE_AUTH_DOMAIN
  - VITE_FIREBASE_PROJECT_ID
  - VITE_FIREBASE_STORAGE_BUCKET
  - VITE_FIREBASE_APP_ID

Source: frontend/src/vite-env.d.ts
- Also declares VITE_FIREBASE_MESSAGING_SENDER_ID (not used in code)

### 2.3 Firestore collection names and usage

Backend writes:
- health_predictions (predict_health)
- production_predictions (predict_milk_production)
- predictions (full simulation + iot_simulator)

Frontend reads:
- predictions (getPredictionById)

Sources:
- backend/services/predictions.py
- backend/services/firestore.py
- scripts/iot_simulator.py
- frontend/src/services/firebase.ts

### 2.4 Authentication requirements and bypass behavior

Backend API auth:
- All API routers depend on get_current_user (Firebase token verification).
- If Firebase Admin is not configured, get_current_user returns "dev-user" and bypasses auth.

WebSocket auth:
- If Firebase Admin is not configured, WebSocket accepts connections without token.

Frontend auth:
- AuthGuard redirects to /login if not authenticated.
- Login uses Firebase email/password auth; no demo bypass exists in code.
- If Firebase is not configured, LoginPage shows "Firebase is not configured" and blocks login.

Mock login endpoint check:
- No /api/auth/mock-login endpoint found in backend API routes (only /api/anomalies, /api/predict, /api/realtime, /api/vision, /api/ws).

Sources:
- backend/api/deps.py
- backend/api/ws.py
- frontend/src/components/AuthGuard.tsx
- frontend/src/pages/LoginPage.tsx

## 3. Network & Monorepo Structure

### 3.1 CORS and origins

Source: backend/core/config.py
- FRONTEND_ORIGIN (default http://localhost:5173)
- FRONTEND_ORIGINS (comma-separated; defaults to FRONTEND_ORIGIN + http://127.0.0.1:5173)

Source: backend/core/cors.py
- allow_origins uses settings["frontend_origins"]

### 3.2 Vite build output

Source: frontend/vite.config.ts
- No custom build output configured; Vite default output is dist

Source: backend/main.py
- FRONTEND_DIST = <repo>/frontend/dist
- Backend mounts /assets and serves index.html from frontend/dist

SPA routing configuration:
- No firebase.json, _redirects, vercel.json, or netlify.toml found in the repo.
- Frontend uses BrowserRouter; SPA rewrites will be required on the hosting platform to route all paths to index.html.

### 3.3 API base URL used by frontend

Source: frontend/src/services/api.ts
- Uses VITE_API_BASE_URL (defaults to http://localhost:8000)

## Appendix: Locations for quick review

- Model inference: backend/models/inference.py, backend/models/vision_inference.py
- Firebase Admin: backend/core/firebase_admin.py
- Firestore writer: backend/services/firestore.py
- Firebase JS SDK: frontend/src/services/firebase.ts
- Auth guard: frontend/src/components/AuthGuard.tsx
- CORS config: backend/core/config.py, backend/core/cors.py
- Vite output: frontend/vite.config.ts
