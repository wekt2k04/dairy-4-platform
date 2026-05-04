# Dairy 4.0 Frontend – Setup & Run

## Environment Setup

### 1. Install Dependencies

```bash
npm install
```

This installs all packages from `package.json`:
- React 18
- Vite (dev server & build tool)
- Tailwind CSS (utility-first styling)
- React Router (navigation)
- Lucide React (icons)
- Firebase (optional client auth/Firestore)

### 2. Environment Variables

Create a `.env.local` file in the frontend root:

```bash
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_APP_ID=your_app_id
EOF
```

**Note:** Firebase variables are optional. The frontend will work without them (no auth persistence).

## Running the App

### Development Mode

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot-reloading.

### Production Build

```bash
npm run build
```

Outputs optimized bundle to `dist/`

### Preview Build Locally

```bash
npm run preview
```

Serves the `dist/` folder locally for pre-deployment testing.

## Project Structure

```
src/
├── main.tsx              React entry point with Router setup
├── App.tsx               Route definitions (/, /simulate, /dashboard)
├── types.ts              TypeScript interfaces (HealthInput, etc.)
├── vite-env.d.ts         Vite environment variable typings
├── index.css             Tailwind directives + custom theme
├── services/
│   ├── api.ts            Fetch wrappers for backend endpoints
│   └── firebase.ts       Optional Firebase initialization
├── components/
│   ├── AppShell.tsx      Root layout with header
│   ├── HealthGauge.tsx   Circular SVG gauge for health score
│   ├── MilkTrendChart.tsx  SVG line chart for production forecast
│   ├── VisionPlayer.tsx    HTML5 video player + simulated YOLO boxes
│   └── index.ts          Export barrel
└── pages/
    ├── LoginPage.tsx     Hardcoded admin/admin login form
    ├── SimulatePage.tsx  Input controls + video upload
    ├── DashboardPage.tsx Results display with charts
    └── index.ts          Export barrel
```

## Pages Overview

### Login (`/`)
- **Hardcoded credentials**: `admin` / `admin`
- Token stored in `localStorage` as `dairy4.authToken`
- Redirects to `/simulate` on successful login

### Simulation Control Panel (`/simulate`)
- Sliders for physiological inputs:
  - Body Temperature (35–43°C)
  - Heart Rate (20–150 bpm)
  - Rumen pH (4.0–8.0)
  - Activity Score (0–100)
- Number inputs:
  - Yesterday's Milk Production (0+ liters)
  - Time of Record (HH:MM format)
- Drag-and-drop video upload zone
- Submit button triggers:
  1. Video upload (optional) → get `video_url`
  2. Health prediction API call
  3. Production prediction API call
  4. Save results to `localStorage` as `dairy4.latestRun`
  5. Redirect to `/dashboard`

### Predictive Dashboard (`/dashboard`)
- **Health Block**: SVG circular gauge showing health_score with dynamic colored border and status badge
- **Production Block**: SVG line chart of forecasted milk yield; red banner if drop_alert is true
- **Vision Block**: HTML5 video player with simulated YOLO detection boxes (demo overlays)
- **Summary Stats**: Display of key metrics (confidence scores, yesterday's baseline, etc.)
- Back button returns to `/simulate` for re-runs

## API Integration

All API calls are defined in `src/services/api.ts`:

| Function | Endpoint | Method |
|----------|----------|--------|
| `mockLogin()` | `/api/auth/mock-login` | POST |
| `predictHealth()` | `/api/predict/health` | POST |
| `predictProduction()` | `/api/predict/production` | POST |
| `uploadVideo()` | `/api/vision/upload` | POST (multipart) |

**Base URL**: Set via `VITE_API_BASE_URL` env var (default: `http://localhost:8000`)

## Styling with Tailwind CSS

### Custom Theme Colors

Defined in `tailwind.config.js`:
- `pasture` (teal): `#2C5E4E`
- `pastureDark` (dark teal): `#16362E`
- `cream`: `#F4EBDD`
- `rust`: `#C46A3C`
- `mist`: `#F7F4EE`
- `slateInk` (dark gray): `#1E2523`

### Global Styles

Custom utilities in `src/index.css`:
- `glass-panel`: Frosted glass effect with border and shadow
- `soft-input`: Rounded input field with focus ring
- `soft-button`: Rounded button base (colors applied per use)
- `label-chip`: Small uppercase badge

## Building & Deployment

### Production Build Steps

```bash
# 1. Run TypeScript compiler and Vite bundler
npm run build

# 2. Output goes to dist/
# 3. Deploy dist/ folder to any static hosting:
#    - Vercel
#    - Netlify
#    - Azure Static Web Apps
#    - S3 + CloudFront
```

### Docker Build (Optional)

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

Build & run:
```bash
docker build -t dairy-4-frontend .
docker run -p 3000:4173 dairy-4-frontend
```

## Troubleshooting

### Port 5173 Already in Use

```bash
# Kill process on port 5173
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5173 && taskkill /PID <PID> /F  # Windows

# Or run on a different port
npm run dev -- --port 3000
```

### API Calls Failing

1. **Check backend is running**: `curl http://localhost:8000/healthz`
2. **Verify `VITE_API_BASE_URL`**: Default is `http://localhost:8000`
3. **CORS issues**: Backend should have `FRONTEND_ORIGIN=http://localhost:5173`

### TypeScript Errors

If TypeScript complains about `import.meta.env`:
- Ensure `src/vite-env.d.ts` exists with proper type definitions
- Run `npm run build` to validate

### Video Upload Not Working

1. Check network tab in DevTools for upload request status
2. Verify backend `/api/vision/upload` endpoint is responding
3. Check backend `./uploads/` directory for stored files
4. Ensure frontend has permission to read uploaded files (CORS headers)

## Optional: Firebase Authentication

If you want persistent auth instead of mock login:

1. **Initialize Firebase in `.env.local`**
2. **Uncomment Firebase imports** in `src/pages/LoginPage.tsx` (requires modification)
3. **Use `signInWithEmailAndPassword()`** instead of `mockLogin()`

Current setup uses mock login for quick bootstrap; production should integrate real auth.

---

For full architecture and API documentation, see [../README.md](../README.md)
