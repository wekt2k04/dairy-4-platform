# Dairy 4.0 Frontend — Architecture & UX

This document explains the React frontend architecture, state management strategy, and the philosophy behind the simplified "Essential Interface" design.

---

## Philosophy: The "Essential Interface"

The Dairy 4.0 frontend is designed around **operator simplicity**. Instead of complex configuration screens or multiple prediction endpoints, the interface asks for **only essential sensor variables** and presents results in **three clean, independent blocks**.

### Design Principle: One Button, Three Insights

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAIRY 4.0 OPERATOR FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: SimulatePage                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Enter Essential Data:                                    │   │
│  │ - Temperature (°C)          [   38.5    ]                │   │
│  │ - Heart Rate (bpm)          [    72    ]                │   │
│  │ - Rumen pH                  [   6.8    ]                │   │
│  │ - Activity Score (0-100)    [    70    ]                │   │
│  │ - Yesterday's Milk (L)      [   28.0   ]                │   │
│  │                                                          │   │
│  │ Optional: Upload Video     [  Drop zone  ]               │   │
│  │                                                          │   │
│  │                    [  Run AI Diagnostics  ]             │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                                                      │
│  Step 2: Backend Orchestration                                  │
│  (Health + Production run in parallel; Vision optional)         │
│           ↓                                                      │
│  Step 3: DashboardPage                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  ┌────────────┬─────────────┬──────────────┐            │   │
│  │  │ HEALTH     │ PRODUCTION  │ VISION       │            │   │
│  │  │            │             │              │            │   │
│  │  │  Gauge     │  Chart      │ Detections   │            │   │
│  │  │  80% ✓     │  28.5L ↗    │  2 Cows      │            │   │
│  │  │            │             │              │            │   │
│  │  │ Healthy    │ Yield ↑     │ Ruminating   │            │   │
│  │  │ No issues  │ Confident   │              │            │   │
│  │  │            │             │              │            │   │
│  │  └────────────┴─────────────┴──────────────┘            │   │
│  │  (Vision block hidden if no video uploaded)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Management: API-Backed, Not LocalStorage

### Key Principle: Server is Source of Truth

**Dairy 4.0 has completely eliminated browser `localStorage`.** Here's why and how:

| Aspect | Old (localStorage) | New (API + Firestore) |
|--------|-------------------|----------------------|
| **Persistence** | Browser only | Persistent, queryable database |
| **Multi-device** | Not synced | Accessible from any device |
| **Audit trail** | No history | Full prediction history in Firestore |
| **Offline behavior** | Stale data | Graceful error message |
| **Size limits** | 5–10 MB | Unlimited |

### State Flow

#### 1. **During Simulation (SimulatePage)**
```typescript
// State: Local React state during form entry
const [temperature, setTemperature] = useState(38.5);
const [heartRate, setHeartRate] = useState(72);
// ... other inputs

// On submit: POST to backend
const response = await runFullSimulation({
  temperature_c: temperature,
  heart_rate_bpm: heartRate,
  // ... etc
});

// Response includes prediction_id + results
// Navigate to dashboard with state:
navigate('/dashboard', { state: { prediction: response } });
```

#### 2. **During Display (DashboardPage)**
```typescript
// Option A: Use route state (immediate, fresh from backend)
const location = useLocation();
const { prediction } = location.state || {};

// Option B: Fetch from Firestore by prediction_id (for page refresh)
const [prediction, setPrediction] = useState(null);
useEffect(() => {
  if (!prediction && predictionId) {
    fetchPredictionFromFirestore(predictionId).then(setPrediction);
  }
}, [predictionId]);

// Render blocks independently:
// - Health block: uses prediction.health
// - Production block: uses prediction.production
// - Vision block: conditional on prediction.vision presence
```

#### 3. **On Page Refresh**
```typescript
// If user refreshes DashboardPage:
// 1. Extract predictionId from URL query param
// 2. Fetch from Firestore: GET /predictions/{predictionId}
// 3. Display results (no local cache needed)

// If user navigates away and back:
// 1. SimulatePage resets to empty form
// 2. No stale data served from localStorage
// 3. Fresh API calls on re-run
```

---

## Component Architecture

### Page Components

| Component | Purpose | State |
|-----------|---------|-------|
| **SimulatePage** | Sensor input form + video upload | React local state |
| **DashboardPage** | 3-block results display | Route state + optional Firestore fetch |

### Layout Components

| Component | Purpose | Props |
|-----------|---------|-------|
| **AppShell** | Root layout with header | children |
| **HealthGauge** | Circular SVG gauge | `score`, `status` |
| **MilkTrendChart** | Line chart for yield | `predictedYield`, `dropAlert` |

### Removed Components

- **VisionPlayer.tsx** — ✗ Deleted. (Previously hardcoded YOLO boxes; vision results now display in DashboardPage as plain data.)

---

## Pages in Detail

### SimulatePage (`/simulate`)

**Purpose:** Collect essential sensor data and optional video.

**Inputs (Essential):**
```typescript
interface SimulationInput {
  temperature_c: number;         // 37–41°C
  heart_rate_bpm: number;        // 40–120 bpm
  rumen_ph: number;              // 5.0–8.0
  activity_score: number;        // 0–100
  milk_yesterday_liters: number; // 0+ L
}
```

**Optional Input:**
- `video_url` (file upload or URL)

**Button:** "Run AI Diagnostics"
- Calls `POST /api/predict/full-simulation`
- On success, navigates to `/dashboard` with prediction state.

**Design Principle:**
- No toggles, no advanced options.
- Sliders for continuous values (temp, HR, pH, activity).
- Number input for yesterday's milk.
- Optional drag-drop zone for video.

### DashboardPage (`/dashboard`)

**Purpose:** Display health, production, and vision outputs in 3 independent blocks.

**Layout:**
```
┌─────────────────────────────────────────┐
│   Health Block         Production Block  │
│  ┌──────────────┐    ┌──────────────┐  │
│  │     Gauge    │    │    Chart     │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
│         Vision Block (conditional)      │
│         ┌──────────────────────────┐   │
│         │  Detections (if video)   │   │
│         └──────────────────────────┘   │
│                                         │
│    [Back]                               │
└─────────────────────────────────────────┘
```

**Block Behavior:**

1. **Health Block**
   - Displays health_score (0–1) as circular gauge.
   - Shows status badge: "Healthy", "Warning", "Critical".
   - Always rendered (required).

2. **Production Block**
   - SVG line chart of predicted milk yield.
   - Shows `drop_alert` flag as red banner if true.
   - Always rendered (required).

3. **Vision Block**
   - Only renders if `prediction.vision` exists (i.e., video was uploaded).
   - Displays detected cows, bounding boxes, behavior labels.
   - If missing, block is hidden without layout shift (CSS `display: none`).

**Data Source:**
- **First load:** Route state from SimulatePage.
- **Page refresh:** Firestore fetch using URL query param `?id={prediction_id}`.

---

## API Integration

### Unified Prediction Endpoint

**Method:** `POST /api/predict/full-simulation`

**Request:**
```json
{
  "temperature_c": 38.5,
  "heart_rate_bpm": 72,
  "rumen_ph": 6.8,
  "activity_score": 70,
  "milk_yesterday_liters": 28.0,
  "video_url": "https://example.com/video.mp4"  // Optional
}
```

**Response:**
```json
{
  "prediction_id": "uuid-12345",
  "timestamp": "2024-01-15T10:30:00Z",
  "inputs": { /* echoed input */ },
  "health": {
    "health_status": "Healthy",
    "health_score": 0.85,
    "confidence_score": 0.92
  },
  "production": {
    "milk_yield_liters": 28.5,
    "drop_alert": false,
    "confidence_score": 0.87
  },
  "vision": {
    "detections": [
      {
        "box": { "x1": 100, "y1": 150, "x2": 300, "y2": 400 },
        "confidence": 0.95,
        "behavior": "rumination"
      }
    ]
  }
}
```

---

## Environment Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=<optional>
VITE_FIREBASE_AUTH_DOMAIN=<optional>
VITE_FIREBASE_PROJECT_ID=<optional>
```

**Note:** Firebase variables are optional. The frontend works without them during development.

---

## Local Development

### Start Dev Server

```bash
npm run dev
```

Runs on `http://localhost:5173` with hot-reload.

### Build for Production

```bash
npm run build
```

Outputs optimized bundle to `dist/`.

### Preview Production Build

```bash
npm run preview
```

Serves `dist/` locally for pre-deployment testing.

---

## Styling & Theme

### Framework

- **Tailwind CSS** for utility classes.
- **Custom color palette** (see `tailwind.config.js`).

### Custom Utilities

Defined in `src/index.css`:
- `glass-panel` — Frosted glass effect.
- `soft-input` — Rounded input with focus ring.
- `soft-button` — Rounded button base.

### Color Palette

| Name | Value | Usage |
|------|-------|-------|
| `pasture` | `#2C5E4E` | Primary accent |
| `rust` | `#C46A3C` | Alerts/warnings |
| `cream` | `#F4EBDD` | Backgrounds |
| `slateInk` | `#1E2523` | Text |

---

## Deployment

### Static Hosting (Firebase, Vercel, Netlify)

1. **Build:** `npm run build`
2. **Deploy:** Upload `dist/` folder to your hosting provider.
3. **Environment:** Set `VITE_API_BASE_URL` to production backend URL.

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

Build and run:
```bash
docker build -t dairy-4-frontend .
docker run -p 3000:4173 dairy-4-frontend
```

---

## Troubleshooting

### API Calls Failing

1. **Verify backend is running:** `curl http://localhost:8000/health`
2. **Check `VITE_API_BASE_URL`:** Should match your backend host.
3. **CORS headers:** Backend should allow origin `http://localhost:5173` during development.

### Page Refresh Shows No Results

- **Cause:** DashboardPage tries to fetch from Firestore but prediction ID is missing.
- **Solution:** Ensure URL includes `?id={prediction_id}` or return to SimulatePage to re-run.

### TypeScript Errors

- **Run:** `npm run build` to validate.
- **Ensure:** `src/vite-env.d.ts` exists with proper type definitions.

---

## Next Steps

For full system architecture, see [../README.md](../README.md).
For backend API documentation, see [../backend/models/README.md](../backend/models/README.md).
