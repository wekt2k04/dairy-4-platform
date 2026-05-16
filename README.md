# Dairy 4.0 Platform — Production-Ready MVP

## Project Overview

**Dairy 4.0** is a comprehensive AI-driven platform for modern dairy farm operations. It integrates real-time IoT sensor data, machine learning inference, and intuitive dashboards to optimize herd health, production metrics, and operational decisions.

The platform is built as a **React + FastAPI monorepo** with **Firebase Firestore** as the persistence layer and is fully containerized for **DigitalOcean Droplet deployment**.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite + TypeScript | Interactive web interface for operators |
| **Backend** | FastAPI (Python 3.11) | RESTful API with async model orchestration |
| **ML Models** | PyTorch LSTM, Scikit-Learn, YOLO/ViT | Independent health, production, and vision inference |
| **Database** | Firebase Firestore | Scalable document storage for predictions |
| **Auth** | Firebase Auth (production) / Mock (demo) | Secure user management |
| **Cloud** | DigitalOcean App Platform + Docker | Containerized deployment |
| **IoT Simulator** | Python 3.11 + Firebase Admin SDK | Realistic telemetry generation for testing |

---

## Global Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       DAIRY 4.0 SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (React/Vite)                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ SimulatePage: Capture sensor data + optional video      │   │
│  │ Button: "Run AI Diagnostics" → POST /api/predict/...   │   │
│  │ DashboardPage: 3-block display (Health|Production|Vision)   │
│  └─────────────────────────────────────────────────────────┘   │
│           ↓                                                     │
│  Unified Prediction Endpoint                                   │
│  POST /api/predict/full-simulation                             │
│  (JSON body: temperature, heart_rate, respiration, milk_yield, │
│   optional: video_url)                                         │
│           ↓                                                     │
│  Backend Orchestration (FastAPI)                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Health Model (Scikit-Learn)                          │   │
│  │    Input: [temp, HR, respiration, milk] → Binary output │   │
│  │    Runs in threadpool (non-blocking)                    │   │
│  │                                                         │   │
│  │ 2. Production Model (PyTorch LSTM)                      │   │
│  │    Input: [features...] → Continuous prediction         │   │
│  │    Runs in threadpool (non-blocking)                    │   │
│  │                                                         │   │
│  │ 3. Vision Model (YOLO/ViT, OPTIONAL)                    │   │
│  │    Input: video_url (if provided) → Detections          │   │
│  │    Skipped if no video; never blocks health/production  │   │
│  └─────────────────────────────────────────────────────────┘   │
│           ↓                                                     │
│  Firestore Document Write                                      │
│  (predictions collection)                                       │
│  {                                                              │
│    "timestamp": ISO string,                                    │
│    "inputs": { ...sensor data... },                            │
│    "health": { ...model output... },                           │
│    "production": { ...model output... },                       │
│    "vision": { ...if available... }                            │
│  }                                                              │
│           ↓                                                     │
│  Frontend Reads State                                          │
│  - From route state (immediate result)                         │
│  - From Firestore (persistent history)                         │
│           ↓                                                     │
│  Dashboard Display (3 independent blocks)                      │
│  └─ Health Gauge                                               │
│  └─ Production Metrics                                         │
│  └─ Vision Detections (hidden if no video)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Decoupled Models:** Health, Production, and Vision models are completely independent. Failure or absence of one does not affect the others.
2. **Firestore as Source of Truth:** All prediction results are persisted to Firestore by the backend. The frontend reads from API (immediate state) or Firestore (history).
3. **No `localStorage`:** All state is now server-backed (API route state + Firestore), enabling multi-device consistency and real-time collaboration.
4. **Async/Threadpool Inference:** Model predictions run on a thread pool, preventing the FastAPI event loop from blocking.
5. **Graceful Degradation:** If a model artifact is missing or service unavailable, the system continues with available models.

---

## Quick Start Guide

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, for containerized deployment)
- Firebase project credentials (`.env` or environment variables)

### Backend (FastAPI)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables (or use .env)
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
export MODEL_WEIGHTS_DIR="./models/weights"
export VITE_API_BASE_URL="http://localhost:8000"

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Visit `http://localhost:8000/docs` to explore the API.

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to access the Dairy 4.0 dashboard.

### Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up --build

# Or build the backend image manually
docker build -t dairy-4-backend ./backend
docker run -p 8000:8000 \
  -e GOOGLE_APPLICATION_CREDENTIALS="/app/serviceAccountKey.json" \
  -v $(pwd)/backend/models/weights:/app/backend/models/weights \
  dairy-4-backend
```

---

## Repository Structure

```
dairy-4-platform/
├── README.md                          # This file (global architecture)
├── Dockerfile                         # Backend container definition
├── docker-compose.yml                 # Multi-service orchestration
│
├── backend/
│   ├── main.py                        # FastAPI entry point
│   ├── requirements.txt                # Python dependencies
│   ├── models/
│   │   ├── weights/                   # Model artifacts
│   │   │   ├── health_model.joblib    # Scikit-Learn classifier
│   │   │   ├── production_lstm.pt     # PyTorch LSTM checkpoint
│   │   │   └── vision_weights/        # YOLO/ViT weights (optional)
│   │   └── README.md                  # Detailed model documentation
│   ├── services/
│   │   ├── health.py                  # Health model inference
│   │   ├── production.py               # Production model inference
│   │   ├── vision.py                  # Vision model inference
│   │   ├── predictions.py              # Unified orchestration
│   │   └── firestore.py                # Firestore write operations
│   ├── api/
│   │   ├── auth.py                    # Mock/Real auth endpoints
│   │   ├── health.py                  # Health check routes
│   │   └── predict.py                 # Unified prediction endpoint
│   └── config.py                      # Configuration & env loading
│
├── frontend/
│   ├── README.md                      # Frontend architecture & state management
│   ├── package.json
│   ├── src/
│   │   ├── main.tsx                   # React entry point
│   │   ├── pages/
│   │   │   ├── SimulatePage.tsx       # Sensor input form + "Run AI Diagnostics"
│   │   │   └── DashboardPage.tsx      # 3-block output display
│   │   ├── services/
│   │   │   ├── api.ts                 # Unified prediction API client
│   │   │   └── firebase.ts            # Firestore fetching
│   │   └── App.tsx                    # Routing (SimulatePage → DashboardPage)
│   └── vite.config.ts
│
├── scripts/
│   └── iot_simulator.py               # Firestore-writing telemetry feeder
│
└── docs/
    └── handover/
        ├── 01-FIREBASE_AND_AUTH.md   # Real Firestore setup & Firebase Auth migration
        ├── 02-IOT_HARDWARE_INTEGRATION.md # Arduino/Raspberry Pi replacement
        └── 03-ADDING_NEW_FEATURES.md # Architectural rules for extensions
```

---

## Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/predict/full-simulation` | Unified prediction (all 3 models) |
| `POST` | `/api/auth/mock-login` | Mock authentication (demo mode) |
| `GET` | `/health` | System health check |

---

## Next Steps

1. **Firebase Setup:** Follow [`docs/handover/01-FIREBASE_AND_AUTH.md`](docs/handover/01-FIREBASE_AND_AUTH.md) to configure real Firestore and Firebase Auth.
2. **Hardware Integration:** Replace `scripts/iot_simulator.py` with real Arduino/Raspberry Pi sensors using [`docs/handover/02-IOT_HARDWARE_INTEGRATION.md`](docs/handover/02-IOT_HARDWARE_INTEGRATION.md).
3. **Feature Development:** Use [`docs/handover/03-ADDING_NEW_FEATURES.md`](docs/handover/03-ADDING_NEW_FEATURES.md) as a guide for extending the platform.

---

## Support

For detailed technical information on individual components, see:
- **ML Models:** [`backend/models/README.md`](backend/models/README.md)
- **Frontend Architecture:** [`frontend/README.md`](frontend/README.md)
