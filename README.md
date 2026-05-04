# Dairy 4.0 Platform – Precision Livestock Farming

A production-ready, full-stack MLOps web application for real-time dairy herd health monitoring, milk production forecasting, and behavioral analysis.

## 📋 Architecture Summary

```
dairy-4-platform/
├── frontend/              React.js 18 + Vite + Tailwind CSS
│   └── Responsive React pages with client-side routing
├── backend/               FastAPI + Pydantic + Firebase Admin SDK
│   ├── /api               REST endpoints for auth, predictions, vision
│   ├── /schemas           Pydantic validation models
│   ├── /services          Business logic, Firestore writes
│   ├── /models            Inference orchestration layer
│   │   ├── /weights       Drop-in zone for trained model artifacts
│   │   └── inference.py   Wrapper that loads .joblib and .pt files
│   └── /core              Firebase and CORS config
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+** (for backend)
- **Node.js 18+** (for frontend)
- Optional: Firebase Project with service account credentials

### Backend Setup

```bash
# Navigate to backend directory
cd dairy-4-platform/backend

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Set environment variables for Firebase
export FIREBASE_PROJECT_ID="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Run the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`.

### Frontend Setup

```bash
# Navigate to frontend directory
cd dairy-4-platform/frontend

# Install dependencies
npm install

# Create a .env.local file (optional, for Firebase integration)
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
EOF

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## 📡 API Overview

### Authentication
- **`POST /api/auth/mock-login`**  
  Hardcoded credentials: `admin` / `admin`

### Health Predictions
- **`POST /api/predict/health`**  
  Accepts: `HealthInput` (temperature_c, heart_rate_bpm, rumen_ph, activity_score)  
  Returns: `HealthPredictionResponse` (health_status, health_score, confidence_score)

### Production Forecasting
- **`POST /api/predict/production`**  
  Accepts: `ProductionInput` (all HealthInput fields + milk_yesterday_liters, time_of_day_hhmm, video_url)  
  Returns: `ProductionPredictionResponse` (milk_yield_liters, drop_alert, confidence_score)

### Vision Upload
- **`POST /api/vision/upload`**  
  Accepts: multipart form-data with `video` file  
  Returns: `VideoUploadResponse` (video_url, filename)  
  Uploaded files are stored in `/backend/uploads` and served from `/static/uploads`

## 🧠 Model Integration (Data Science Drop-In)

### Location
All model artifacts must be placed in `/backend/models/weights/`

### Health Diagnostic Model
- **File**: `health_model.joblib`
- **Type**: Scikit-learn pipeline or ensemble
- **Inputs**: `[temperature_c, heart_rate_bpm, rumen_ph, activity_score]` (numeric array)
- **Outputs**: `health_status` (Healthy/Warning/Critical), `health_score` (0–100), `confidence_score` (0–1)
- **Fallback**: If not present, the backend uses a deterministic heuristic

### Milk Production Forecasting Model
- **File**: `dairy4_lstm.pt`
- **Type**: PyTorch `state_dict`
- **Architecture**: 2-layer bidirectional LSTM, `hidden_size=128`, `input_size=18`
- **Heads**: `fc_reg` (regression) → `milk_yield_liters`, `fc_cls` (classification) → `drop_alert`
- **Inputs**: Float32 tensor, shape `(batch, 7, 18)` (7-day sliding window, 18 features per day)
- **Preprocessing**: StandardScaler fitted on training data only
- **Outputs**: `milk_yield_liters` (float), `drop_alert` (boolean, True if predicted ≤ 85% of yesterday)
- **Fallback**: If not present, the backend uses a multi-factor heuristic (health score, time of day, rumen pH, activity, milk baseline)

### Vision Behavioral Model
- Videos are uploaded to `/api/vision/upload` and converted to persistent URLs
- Pass the URL to your downstream vision pipeline via the `video_url` field in `/api/predict/production`
- YOLO/ViT bounding boxes are simulated in the frontend for demo purposes

## 🎨 Frontend Pages

### 1. Login (`/`)
- Hardcoded credentials: `admin` / `admin`
- Minimal design, direct navigation to simulator

### 2. Simulation Control Panel (`/simulate`)
- Sliders/inputs for physiological telemetry (temperature, heart rate, rumen pH, activity)
- Input fields for yesterday's milk production and time of record
- Drag-and-drop zone for farm video upload
- Submit button triggers both health and production inferences
- Results stored in browser localStorage and redirected to dashboard

### 3. Predictive Dashboard (`/dashboard`)
- **Health Block**: Circular gauge chart showing health_score and dynamic status badge
- **Production Block**: Line chart of predicted milk yield with drop alert banner
- **Vision Block**: HTML5 video player with simulated YOLO bounding boxes
- **Summary Stats**: Display of raw telemetry and confidence scores
- Navigation back to simulator for re-runs

## 🏗️ Project Structure Details

```
backend/
├── main.py                 FastAPI app entry point with CORS, static file mounting
├── requirements.txt        Python dependencies
├── api/
│   ├── router.py          Aggregated route registry
│   ├── auth.py            Mock JWT login endpoint
│   ├── predict.py         Health & production inference endpoints
│   └── vision.py          Video upload endpoint
├── schemas/
│   ├── health.py          HealthInput, HealthPredictionResponse
│   ├── production.py       ProductionInput, ProductionPredictionResponse
│   └── video.py           VideoUploadResponse
├── services/
│   ├── predictions.py      Orchestration: calls inference engine & logs to Firestore
│   ├── storage.py          Video file persistence with UUID naming
│   └── firestore.py        Write-through optional Firestore integration
├── models/
│   ├── inference.py        DairyInferenceEngine: loads .joblib & .pt files, falls back to heuristics
│   └── weights/            DROP-IN ZONE for data science team
│       ├── health_model.joblib
│       ├── dairy4_lstm.pt
│       └── README.md       Drop-in specification document
└── core/
    ├── config.py          Environment config loader
    ├── cors.py            CORS middleware setup
    └── firebase_admin.py   Firebase Admin SDK initialization

frontend/
├── package.json            Dependencies (React, Vite, Tailwind, Firebase)
├── vite.config.ts          Build & dev server config
├── tsconfig.json           TypeScript settings
├── index.html              Entry point
├── src/
│   ├── main.tsx            React entry, router setup
│   ├── App.tsx             Route definitions
│   ├── types.ts            TypeScript interfaces
│   ├── vite-env.d.ts       Vite client environment typings
│   ├── index.css           Tailwind + custom theme
│   ├── services/
│   │   ├── api.ts          Fetch wrappers for all backend endpoints
│   │   └── firebase.ts     Optional Firebase client initialization
│   ├── components/
│   │   ├── AppShell.tsx    Root layout with header
│   │   ├── HealthGauge.tsx SVG circular gauge
│   │   ├── MilkTrendChart.tsx  SVG line chart
│   │   ├── VisionPlayer.tsx    HTML5 video + simulated YOLO boxes
│   │   └── index.ts
│   └── pages/
│       ├── LoginPage.tsx   Credentials form
│       ├── SimulatePage.tsx    Form with input controls & video upload
│       ├── DashboardPage.tsx   Results display with charts
│       └── index.ts
```

## 🔧 Configuration & Environment Variables

### Backend

| Variable | Default | Purpose |
|----------|---------|---------|
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allowed origin |
| `FIREBASE_PROJECT_ID` | (empty) | GCP project ID for Firestore |
| `GOOGLE_APPLICATION_CREDENTIALS` | (empty) | Path to Firebase service account JSON |
| `MODEL_WEIGHTS_DIR` | `./backend/models/weights` | Location of .joblib and .pt files |

### Frontend

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API root URL |
| `VITE_FIREBASE_*` | (empty) | Firebase config for optional client-side auth/Firestore |

## 🧪 Testing the Platform

### 1. Log in
- Navigate to `http://localhost:5173`
- Enter `admin` / `admin`

### 2. Adjust telemetry
- Use sliders to simulate cow health metrics
- Select a farm video (or skip for demo)
- Click **Run Predictions**

### 3. View results
- Dashboard shows:
  - Health gauge and status
  - Production forecast with drop-alert if yield < 85% of baseline
  - Video playback with simulated YOLO overlays
  - Telemetry summary cards

## 🔐 Security & Notes

- **No training code** is included; artifacts must be pre-trained by the data science team
- **Mock JWT** is returned by login endpoint; production should use real Firebase Auth
- **Local storage** persists session data; production should use backend sessions or Auth0
- **CORS** is configured for frontend origin only; adjust `FRONTEND_ORIGIN` for production
- **Video storage** uses UUID-prefixed filenames to prevent collisions

## 📦 Dependencies Summary

### Backend
- `fastapi` – HTTP server framework
- `uvicorn` – ASGI application server
- `pydantic` – Request/response validation
- `firebase-admin` – Firestore and Auth SDKs (optional)
- `joblib` – Model loading (Scikit-learn)
- `numpy`, `pandas`, `scikit-learn` – ML utilities
- `torch` – PyTorch for LSTM inference

### Frontend
- `react` – UI library
- `react-router-dom` – Client-side routing
- `react-dom` – React rendering
- `vite` – Build tool and dev server
- `tailwindcss` – Utility-first CSS
- `lucide-react` – Icon library
- `firebase` – Optional auth/Firestore client
- `recharts` – (optional for future charting upgrades)

## 🎯 Next Steps

1. **Build & Deploy**: Use Docker to containerize backend and frontend; deploy to Azure Container Instances or App Service
2. **Add Real Models**: Drop `health_model.joblib` and `dairy4_lstm.pt` into `/backend/models/weights/`
3. **Firebase Integration**: Supply Firebase credentials to enable Firestore logging of all predictions
4. **CI/CD**: Set up GitHub Actions to run tests and deploy on push
5. **Monitoring**: Add observability (Application Insights, custom logging) for production ops

---

**Built with:** FastAPI, React, Tailwind CSS, Pydantic, Firebase  
**Architecture**: MLOps-first, backend-driven, model-agnostic  
**Status**: Bootstrap-ready, production-capable
