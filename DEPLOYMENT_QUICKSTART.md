# Dairy 4.0 DigitalOcean Deployment — Quick Reference

## Pre-Deployment Checklist

- [ ] Firebase project created + service account key downloaded
- [ ] Droplet created (Ubuntu 22.04 LTS, 2GB+ RAM recommended)
- [ ] SSH key generated or password set
- [ ] Domain name ready (or use Droplet IP)

---

## Deployment Steps (15 minutes)

### 1. Connect to Droplet
```bash
ssh -i /path/to/id_rsa root@<DROPLET_IP>
```

### 2. System Setup
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install -y docker-compose
rm get-docker.sh
```

### 3. Clone Repository
```bash
cd /opt && git clone https://github.com/<YOUR_USERNAME>/dairy-4-platform.git
cd dairy-4-platform
```

### 4. Configure Environment
```bash
# Create .env file
cat > .env << 'EOF'
GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json
FIREBASE_PROJECT_ID=your-project-id
FRONTEND_ORIGIN=https://your-frontend.com
FRONTEND_ORIGINS=https://your-frontend.com
MODEL_WEIGHTS_DIR=./backend/models/weights
VITE_API_BASE_URL=https://api.your-domain.com
BACKEND_PORT=8000
EOF
```

### Firebase & Firestore Parameters (current values)

Backend (Firebase Admin SDK) environment variables from deployment .env:

| Parameter | Value | Notes |
| --- | --- | --- |
| GOOGLE_APPLICATION_CREDENTIALS | /app/serviceAccountKey.json | Path used by `firebase-admin` inside the container |
| FIREBASE_PROJECT_ID | your-project-id | Replace with your Firebase project id |

Frontend (Firebase JS SDK) environment variables from frontend/.env in this repo:

| Parameter | Value |
| --- | --- |
| VITE_FIREBASE_API_KEY | AIzaSyA6d77LSIKBbuDcBsZXezpSLPy9PsDPMbw |
| VITE_FIREBASE_AUTH_DOMAIN | dairy-4-platform.firebaseapp.com |
| VITE_FIREBASE_PROJECT_ID | dairy-4-platform |
| VITE_FIREBASE_STORAGE_BUCKET | dairy-4-platform.firebasestorage.app |
| VITE_FIREBASE_APP_ID | 1:318971531912:web:02d0a6748d1dcbfa57c53d |
| VITE_FIREBASE_MESSAGING_SENDER_ID | UNSET (declared in frontend/src/vite-env.d.ts, not set in frontend/.env) |

Firestore collections used by this codebase:

| Collection | Access | Purpose |
| --- | --- | --- |
| predictions | write (backend), read (frontend) | Full simulation output and IoT simulator payloads |
| health_predictions | write (backend) | Health inference outputs |
| production_predictions | write (backend) | Production inference outputs |

### 5. Upload Firebase Key
```bash
# From local machine:
scp -i /path/to/id_rsa serviceAccountKey.json root@<DROPLET_IP>:/opt/dairy-4-platform/backend/
```

### 6. Deploy
```bash
# On Droplet:
docker-compose build
docker-compose up -d
docker-compose logs -f backend  # Wait for models to load
```

### 7. Verify
```bash
curl http://localhost:8000/healthz
# Expected: {"status":"ok"}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (Firebase, domains, ports) |
| `docker-compose.yml` | Container orchestration |
| `Dockerfile` | Backend image definition |
| `backend/serviceAccountKey.json` | Firebase admin credentials |
| `backend/models/weights/` | Model artifacts (YOLO, ViT, Health, LSTM) |

---

## Useful Commands

```bash
# View logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# Stop service
docker-compose down

# View running containers
docker-compose ps

# Check resource usage
docker stats
```

---

## Performance Tuning

### Faster Processing (Lower Accuracy)
```bash
# Edit backend/models/vision_inference.py, line 17
FRAME_SKIP_RATIO = 15  # Process fewer frames
```

### More Accurate (Slower)
```bash
FRAME_SKIP_RATIO = 5  # Process more frames
```

Then rebuild:
```bash
docker-compose build --no-cache && docker-compose restart backend
```

---

## SSL/HTTPS Setup (Optional)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot certonly --standalone -d api.your-domain.com

# Nginx will be auto-configured if you follow 04-DIGITALOCEAN_DEPLOYMENT.md
```

---

## Troubleshooting

**Backend won't start:**
```bash
docker-compose logs backend  # Check error messages
```

**Port 8000 in use:**
```bash
netstat -tulpn | grep 8000
kill -9 <PID>
```

**Out of memory:**
```bash
docker stats  # Check memory usage
# Upgrade Droplet or reduce FRAME_SKIP_RATIO
```

---

## Next Steps

1. Deploy frontend to Firebase Hosting or Vercel
2. Set `FRONTEND_ORIGIN` in `.env` to frontend domain
3. Update `VITE_API_BASE_URL` in frontend `.env` to point to this API
4. Monitor logs daily: `docker-compose logs --tail 50 backend`

---

**For the current runtime and deployment model, see [`README.md`](README.md)**

**For model loading and artifact details, see [`backend/models/README.md`](backend/models/README.md)**
