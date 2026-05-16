# DigitalOcean Deployment Guide — Dairy 4.0 Platform

This is the definitive, step-by-step guide to deploying Dairy 4.0 to a DigitalOcean Docker Droplet with CPU-optimized inference.

---

## Table of Contents

1. [Droplet Setup](#droplet-setup)
2. [Transferring Files](#transferring-files)
3. [Environment Configuration](#environment-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Nginx Setup (Optional)](#nginx-setup-optional)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Droplet Setup

### Step 1: Create a DigitalOcean Droplet

1. **Log in** to DigitalOcean: https://cloud.digitalocean.com/
2. **Create** → **Droplets**
3. **Choose an Image:**
   - Operating System: **Ubuntu 22.04 LTS x64** (or latest LTS)
   - This includes curl, git, and basic development tools
4. **Choose a Plan:**
   - **Basic: $4/month** (512 MB RAM, 1 vCPU, 10 GB SSD) — **Not recommended for video processing**
   - **Basic: $6/month** (1 GB RAM, 1 vCPU, 25 GB SSD) — Minimum viable
   - **Standard: $12/month** (2 GB RAM, 2 vCPU, 50 GB SSD) — **Recommended** ⭐
   - **Standard: $24/month** (4 GB RAM, 2 vCPU, 100 GB SSD) — **Optimal for video processing**

5. **Choose Region:** Select the region closest to your users.
6. **Authentication:**
   - Choose **SSH Key** (recommended) or **Password**
   - If using SSH Key, create and download the key (save as `id_rsa`)
7. **Hostname:** Set to `dairy-4-platform`
8. **Click Create Droplet**

### Step 2: Connect to Your Droplet

Once the Droplet is created, retrieve its **Public IPv4 address** from the dashboard.

**On your local machine:**

If using SSH key:
```bash
# Set correct permissions on SSH key (if not already done)
chmod 600 /path/to/id_rsa

# SSH into the droplet
ssh -i /path/to/id_rsa root@<DROPLET_PUBLIC_IP>
```

If using password:
```bash
ssh root@<DROPLET_PUBLIC_IP>
# When prompted, enter the password sent to your email
```

**Replace `<DROPLET_PUBLIC_IP>` with your actual Droplet IP address.**

### Step 3: Initial System Setup

Once connected to the Droplet, run:

```bash
# Update system packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
apt install -y docker-compose

# Add current user to docker group (optional, allows running docker without sudo)
usermod -aG docker root

# Verify installation
docker --version
docker-compose --version
```

---

## Transferring Files

### Option A: Git Clone (Recommended)

If your repository is on GitHub:

```bash
# On the Droplet, clone the repository
cd /opt
git clone https://github.com/<YOUR_USERNAME>/dairy-4-platform.git
cd dairy-4-platform
```

**Replace `<YOUR_USERNAME>` with your GitHub username.**

### Option B: SCP (Direct File Transfer)

From your local machine:

```bash
# Transfer entire project directory to the Droplet
scp -i /path/to/id_rsa -r /path/to/local/dairy-4-platform root@<DROPLET_PUBLIC_IP>:/opt/

# Verify transfer
ssh -i /path/to/id_rsa root@<DROPLET_PUBLIC_IP> "ls -la /opt/dairy-4-platform"
```

### Option C: DigitalOcean App Platform (Advanced)

If you prefer a managed solution, DigitalOcean's App Platform can deploy directly from GitHub with automatic CI/CD. However, this requires different configuration (see DigitalOcean docs for App Platform setup).

---

## Environment Configuration

### Step 1: Create `.env` File

On the Droplet, create `/opt/dairy-4-platform/.env`:

```bash
cd /opt/dairy-4-platform
cat > .env << 'EOF'
# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json
FIREBASE_PROJECT_ID=your-firebase-project-id

# Frontend Origin (for CORS)
FRONTEND_ORIGIN=https://your-frontend-domain.com
FRONTEND_ORIGINS=https://your-frontend-domain.com

# Model Weights Directory
MODEL_WEIGHTS_DIR=./backend/models/weights

# API Configuration
VITE_API_BASE_URL=https://api.your-domain.com
BACKEND_PORT=8000

# API Keys (if using external services)
LOGGING_LEVEL=INFO
EOF
```

**Replace placeholders:**
- `your-firebase-project-id` — Your Firebase project ID
- `your-frontend-domain.com` — Your frontend domain (e.g., `dairy.example.com`)
- `api.your-domain.com` — Your API domain (e.g., `api.dairy.example.com`)

### Step 2: Add Firebase Service Account Key

On your local machine, retrieve the Firebase Admin SDK JSON key:

1. Go to Firebase Console: https://console.firebase.google.com/
2. **Project Settings** → **Service Accounts**
3. **Generate New Private Key** → Save as `serviceAccountKey.json`

Transfer it to the Droplet:

```bash
scp -i /path/to/id_rsa /path/to/serviceAccountKey.json root@<DROPLET_PUBLIC_IP>:/opt/dairy-4-platform/backend/
```

Verify permissions:

```bash
ssh -i /path/to/id_rsa root@<DROPLET_PUBLIC_IP> "ls -la /opt/dairy-4-platform/backend/serviceAccountKey.json"
chmod 600 /opt/dairy-4-platform/backend/serviceAccountKey.json
```

---

## Docker Deployment

### Step 1: Verify Docker Compose Configuration

On the Droplet, ensure `docker-compose.yml` exists and is correct:

```bash
cd /opt/dairy-4-platform
cat docker-compose.yml
```

It should look like:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - MODEL_WEIGHTS_DIR=./models/weights
      - VITE_API_BASE_URL=${VITE_API_BASE_URL}
    volumes:
      - ./backend/models/weights:/app/backend/models/weights:ro
      - ./backend/serviceAccountKey.json:/app/serviceAccountKey.json:ro
      - ./backend/uploads:/app/backend/uploads
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Step 2: Build and Start the Container

```bash
cd /opt/dairy-4-platform

# Build the Docker image
docker-compose build

# Start the backend service
docker-compose up -d

# Verify the service is running
docker-compose logs -f backend
```

**Wait for the output:**
```
✓ Vision engine (YOLO + ViT) pre-loaded successfully
✓ Inference engine (Health + Production) pre-loaded successfully
```

This confirms that all models are loaded and ready.

### Step 3: Test the Backend

From your local machine:

```bash
# Test health endpoint
curl http://<DROPLET_PUBLIC_IP>:8000/healthz

# Expected output:
# {"status":"ok"}
```

If you get a connection refused error, wait 30 seconds for the container to fully start.

### Step 4: View Logs

To see real-time logs from the backend:

```bash
docker-compose logs -f backend
```

To see logs for a specific number of lines:

```bash
docker-compose logs --tail 100 backend
```

---

## Nginx Setup (Optional)

To expose your backend safely on port 80/443 with a domain name, set up Nginx as a reverse proxy.

### Step 1: Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### Step 2: Create Nginx Configuration

Create `/etc/nginx/sites-available/dairy-4-api`:

```bash
cat > /etc/nginx/sites-available/dairy-4-api << 'EOF'
server {
    listen 80;
    server_name api.your-domain.com;

    # Redirect HTTP to HTTPS (optional but recommended)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    # SSL certificates (use Let's Encrypt via Certbot)
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Reverse proxy to FastAPI backend
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeout for video processing
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # Allow large file uploads (video)
        client_max_body_size 500M;
    }
}
EOF
```

**Replace `api.your-domain.com` with your actual domain.**

### Step 3: Enable the Configuration

```bash
ln -s /etc/nginx/sites-available/dairy-4-api /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

### Step 4: Obtain SSL Certificate (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot certonly --standalone -d api.your-domain.com
```

Follow the prompts. Certbot will automatically renew certificates.

### Step 5: Test Access

```bash
curl https://api.your-domain.com/healthz
# Expected: {"status":"ok"}
```

---

## Monitoring & Maintenance

### Daily Health Checks

```bash
# Check if container is running
docker-compose ps

# View memory/CPU usage
docker stats

# Check recent logs
docker-compose logs --tail 50 backend
```

### Restart Services

If the backend is unresponsive:

```bash
cd /opt/dairy-4-platform
docker-compose restart backend
```

### Full Redeploy (After Code Changes)

```bash
cd /opt/dairy-4-platform

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Verify
docker-compose logs -f backend
```

### Monitor Disk Space

Video processing can accumulate files. Check disk usage:

```bash
df -h

# Clean up old uploaded videos (keep last 30 days)
find /opt/dairy-4-platform/backend/uploads -type f -mtime +30 -delete
```

### Set Up Automatic Log Rotation

Create `/etc/logrotate.d/dairy-4`:

```bash
cat > /etc/logrotate.d/dairy-4 << 'EOF'
/opt/dairy-4-platform/backend/uploads/*.mp4 {
    daily
    rotate 7
    missingok
    compress
    delaycompress
    notifempty
}
EOF
```

---

## CPU Inference Optimization (Already Configured)

The backend is pre-configured for fast CPU inference with:

1. **Frame Skipping:** Processes ~3 frames per second (configurable via `FRAME_SKIP_RATIO` in `vision_inference.py`)
2. **Downsampling:** Resizes frames to 640px max for faster YOLO detection
3. **Thread Limits:** PyTorch uses 2 CPU threads per process
4. **Pre-loading:** All models load on startup, avoiding lazy-load delays

**For a 2GB RAM, 2vCPU droplet:**
- First video processing (~5-10 seconds of video): ~30–60 seconds
- Subsequent requests: ~25–50 seconds (cached models)

To adjust performance, edit `/opt/dairy-4-platform/backend/models/vision_inference.py`:

```python
# Reduce frame processing (faster, less accurate)
FRAME_SKIP_RATIO = 15  # Process 1 frame every 15 (≈ 2 fps for 30 fps video)

# Or increase for better accuracy (slower)
FRAME_SKIP_RATIO = 5   # Process 1 frame every 5 (≈ 6 fps for 30 fps video)
```

Then rebuild:

```bash
cd /opt/dairy-4-platform
docker-compose build --no-cache
docker-compose restart backend
```

---

## Troubleshooting

### Backend Container Won't Start

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**

| Error | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'torch'` | Run `docker-compose build --no-cache` |
| `FileNotFoundError: YOLO model not found` | Verify model files in `backend/models/weights/` |
| `GOOGLE_APPLICATION_CREDENTIALS not found` | Ensure `serviceAccountKey.json` is in `backend/` directory |
| `Out of memory` | Upgrade Droplet RAM or reduce `FRAME_SKIP_RATIO` |

### Slow Video Processing

**Check CPU usage:**
```bash
docker stats
```

**Optimize:**
1. Increase `FRAME_SKIP_RATIO` (process fewer frames)
2. Upgrade to a Droplet with more CPU cores
3. Reduce model batch size (contact support for this)

### CORS Errors in Frontend

**Update `.env` CORS settings:**
```bash
# In /opt/dairy-4-platform/.env
FRONTEND_ORIGIN=https://your-frontend-domain.com
FRONTEND_ORIGINS=https://your-frontend-domain.com,https://another-domain.com
```

**Rebuild:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Firebase Connection Issues

**Verify credentials:**
```bash
# Inside the container
docker exec dairy-4-platform_backend_1 python -c "from core.firebase_admin import initialize_firebase_admin; initialize_firebase_admin(); print('✓ Firebase connected')"
```

If it fails, check that `serviceAccountKey.json` is correctly placed and `.env` contains the right `FIREBASE_PROJECT_ID`.

### Port Already in Use

If port 8000 is already bound:

```bash
# Find what's using port 8000
netstat -tulpn | grep 8000

# Kill the process
kill -9 <PID>

# Or use a different port in docker-compose.yml
# Change "8000:8000" to "8001:8000"
```

---

## Backup & Recovery

### Backup Prediction Data

Firestore is cloud-backed, so no local backup needed.

To export Firestore data:

```bash
# From your local machine, use Firebase CLI
npm install -g firebase-tools
firebase login
firebase firestore:export gs://your-bucket/backup-$(date +%Y%m%d)
```

### Backup Video Uploads

```bash
# Archive uploaded videos
tar -czf dairy-4-uploads-backup.tar.gz /opt/dairy-4-platform/backend/uploads/

# Download to local machine
scp -i /path/to/id_rsa root@<DROPLET_PUBLIC_IP>:/root/dairy-4-uploads-backup.tar.gz ./
```

---

## Next Steps

1. **Test the API:** Use Postman or curl to test `/api/predict/full-simulation`
2. **Deploy Frontend:** Upload your React build to Firebase Hosting or another static host
3. **Set up monitoring:** Configure uptime monitoring (e.g., UptimeRobot)
4. **Enable automatic backups:** Set up DigitalOcean Backups in the Droplet settings

---

## Support & Reference

- **DigitalOcean Docs:** https://docs.digitalocean.com/
- **Docker Docs:** https://docs.docker.com/
- **Nginx Docs:** https://nginx.org/en/docs/
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup

---

**You're ready to deploy! 🚀**

For questions, refer to the main architecture guide in [../README.md](../../README.md).
