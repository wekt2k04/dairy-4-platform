# Dairy 4.0 Backend – Setup & Run

## Environment Setup

### 1. Create Virtual Environment

```bash
# macOS / Linux
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Variables (Optional)

Create a `.env` file in the backend root or export directly:

```bash
export FRONTEND_ORIGIN=http://localhost:5173
export FIREBASE_PROJECT_ID=your-gcp-project-id
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export MODEL_WEIGHTS_DIR=./backend/models/weights
```

## Running the Server

### Development Mode

```bash
# Auto-reload on file changes
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Production Mode

```bash
# No auto-reload, single worker
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

API documentation is automatically available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health check**: `http://localhost:8000/healthz`

## Testing Endpoints

### 1. Mock Login

```bash
curl -X POST http://localhost:8000/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

**Response:**
```json
{
  "success": true,
  "token": "mock-jwt-dairy-4-platform",
  "token_type": "bearer"
}
```

### 2. Health Prediction

```bash
curl -X POST http://localhost:8000/api/predict/health \
  -H "Content-Type: application/json" \
  -d '{
    "temperature_c": 38.5,
    "heart_rate_bpm": 72,
    "rumen_ph": 6.2,
    "activity_score": 74
  }'
```

**Response:**
```json
{
  "health_status": "Healthy",
  "health_score": 82.45,
  "confidence_score": 0.89
}
```

### 3. Production Prediction

```bash
curl -X POST http://localhost:8000/api/predict/production \
  -H "Content-Type: application/json" \
  -d '{
    "temperature_c": 38.5,
    "heart_rate_bpm": 72,
    "rumen_ph": 6.2,
    "activity_score": 74,
    "milk_yesterday_liters": 28.4,
    "time_of_day_hhmm": "08:30"
  }'
```

**Response:**
```json
{
  "milk_yield_liters": 26.78,
  "drop_alert": false,
  "confidence_score": 0.84
}
```

### 4. Video Upload

```bash
curl -X POST http://localhost:8000/api/vision/upload \
  -F "video=@farm_clip.mp4"
```

**Response:**
```json
{
  "video_url": "/static/uploads/abc123def456-farm_clip.mp4",
  "filename": "abc123def456-farm_clip.mp4"
}
```

The uploaded video is accessible at: `http://localhost:8000/static/uploads/abc123def456-farm_clip.mp4`

## Model Artifact Drop-In

### Adding Trained Models

1. **Health Model**:
   - File: `/backend/models/weights/health_model.joblib`
   - Type: Scikit-learn pipeline
   - Must have `predict_proba` method

2. **Production Model**:
   - File: `/backend/models/weights/dairy4_lstm.pt`
   - Type: PyTorch state_dict
   - Backend will auto-load on request if present

The inference engine gracefully falls back to heuristics if models are not found.

See `/backend/models/weights/README.md` for detailed specifications.

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Firebase Errors

If Firebase initialization fails, the app will log a warning but continue running. Firestore writes are optional.

### CORS Issues

Ensure `FRONTEND_ORIGIN` is set to the correct frontend URL (default: `http://localhost:5173`).

## Database & Logging

### Firestore Integration (Optional)

With valid Firebase credentials, predictions are automatically logged to:
- Collection: `health_predictions`
- Collection: `production_predictions`

Each record includes:
- Input values (temperature_c, heart_rate_bpm, etc.)
- Output predictions (health_status, milk_yield_liters, etc.)
- Timestamp

### Local Storage

Uploaded videos are stored in `/backend/uploads` and served as static files.

---

For full architecture and deployment details, see [../README.md](../README.md)
