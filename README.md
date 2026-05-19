# 🐄 Dairy 4.0 Platform

Dairy 4.0 is a comprehensive, AI-driven Precision Livestock Farming (PLF) ecosystem. It leverages a modern decoupled architecture (FastAPI + React) to provide real-time dairy farm monitoring, predictive health analytics, and advanced computer vision processing.

By integrating IoT telemetry (internal biomarkers) with deep learning vision models (external behavior), the platform achieves a deterministic **Sensor Fusion** framework, enabling the detection of pathologies up to 15 hours before clinical manifestation.

---

## 🏗️ Technical Stack

### Frontend (Client-Side)
- **Framework:** React / Vite.js
- **Hosting:** Vercel (Edge Network)
- **Authentication:** Firebase Authentication
- **UI/UX:** Responsive Dashboard optimized for both desktop and mobile viewing.

### Backend (API & Inference)
- **Framework:** FastAPI (Python)
- **Hosting:** Hugging Face Spaces (Dockerized)
- **Database:** Cloud Firestore (NoSQL) for user profiles and prediction history.
- **Computer Vision:** YOLOv8 (Detection) & Vision Transformer / ViT (Behavior Classification).
- **Predictive ML:** LSTM Pro Attention (Production Forecasting) & Scikit-learn (Health Models).

---

## ⚙️ Core Workflows & Synergies

The power of Dairy 4.0 lies in the seamless blending of three primary workflows:

### 1. Vision Inference Pipeline (The Eyes)
Uploaded farm videos or real-time streams are processed by the backend. To ensure mobile compatibility and prevent server timeouts on CPU-only environments (Free Tier), the pipeline implements **Aggressive Downsampling (320px)** and **Frame Skipping (1 frame per 15)**. 
- **YOLOv8** extracts bounding boxes of individual cows.
- **ViT** analyzes the spatial context to classify mutually exclusive states (e.g., *foraging, ruminating, lying down*).
- Visual bounding boxes are persistently drawn across skipped frames to maintain 30fps visual fluidity without computational overhead.

### 2. Predictive Analytics & Sensor Fusion (The Brain)
The system does not rely on univariate data. It cross-references the behavioral data from the Vision Pipeline with simulated IoT telemetry (Rumen pH, Core Body Temperature).
- **Example Synergy:** If a cow is highly recumbent (*lying down*), univariate systems flag generic "lethargy". Dairy 4.0 cross-references this with body temperature: if febrile, it flags *Metritis*; if afebrile, it flags *Lameness*.
- Predictions are logged directly into **Cloud Firestore** for historical analysis.

### 3. Authentication & Real-Time Dashboard (The Interface)
- Users authenticate via **Firebase Auth**.
- The Vite/React frontend fetches the user's specific farm context from Firestore.
- The dashboard dynamically reflects real-time predictions, health anomalies, and processed video playbacks.

---

## 🚀 Runtime Endpoints

The FastAPI backend exposes the following core endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/healthz` | API Health check & uptime. |
| `POST` | `/api/predict/health` | Generates physiological health predictions. |
| `POST` | `/api/predict/production` | LSTM-based milk yield forecasting. |
| `POST` | `/api/predict/full-simulation` | Runs a combined health and production simulation. |
| `POST` | `/api/vision/upload` | Securely uploads raw video to the server temp directory. |
| `POST` | `/api/vision/process` | Triggers the optimized YOLO+ViT inference pipeline. |
| `GET` | `/api/ws/dashboard` | WebSocket endpoint for real-time telemetry updates. |

*(Note: In production, the backend URL is dynamically provided by the Hugging Face Space deployment and must be referenced in the frontend's `.env` as `VITE_API_URL`).*

---

## 💻 Local Development Setup

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Firebase `serviceAccountKey.json` placed safely in the `backend/` directory (ignored by git).

### 1. Run the Backend
```bash
cd backend
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI
uvicorn main:app --host 0.0.0.0 --port 8000 --reload