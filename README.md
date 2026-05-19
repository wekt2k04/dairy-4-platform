# Dairy 4.0 Platform

Dairy 4.0 is a FastAPI + React monorepo for dairy-farm monitoring, prediction, and vision processing.

## What is actually running

- Backend: FastAPI in [backend/main.py](backend/main.py)
- Frontend: Vite/React app in [frontend/src](frontend/src)
- Model artifacts: [backend/models/weights](backend/models/weights)
- Realtime helpers: [backend/api](backend/api) and [backend/services](backend/services)

## Remote access

The backend binds to `0.0.0.0:8000` in Docker, and `docker-compose.yml` publishes port `8000:8000`. That means the app can be reached remotely if you run it on a host with a public IP, a reverse proxy, or a domain name pointing at the host. There is no built-in public link in the code; the URL comes from whatever server or container platform you deploy to.

In local development, the frontend runs on `http://localhost:5173` and the backend on `http://localhost:8000`.

## Runtime endpoints

- `GET /healthz`
- `POST /api/predict/health`
- `POST /api/predict/production`
- `POST /api/predict/full-simulation`
- `POST /api/vision/upload`
- `POST /api/vision/process`
- `GET /api/realtime/cows`
- `GET /api/realtime/cows/{cowId}/live`
- `GET /api/ws/dashboard`

## Model behavior

- Health prediction loads `health_model.joblib` when available, otherwise uses a deterministic fallback.
- Production prediction loads `dairy4_lstm_pro_attention.pt` with `dairy_feature_scaler.joblib` and `dairy_target_scaler.joblib`, otherwise uses a deterministic fallback.
- Vision processing loads `yolo_cow_detector/best.pt` and `vit_behavior_classifier/`.

## Run locally

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

```bash
cd frontend
npm install
npm run dev
```

## Useful files

- [backend/models/inference.py](backend/models/inference.py)
- [backend/models/vision_inference.py](backend/models/vision_inference.py)
- [backend/services/predictions.py](backend/services/predictions.py)
- [frontend/src/services/api.ts](frontend/src/services/api.ts)
- [docker-compose.yml](docker-compose.yml)
- [Dockerfile](Dockerfile)
