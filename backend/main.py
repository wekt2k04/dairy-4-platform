import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
warnings.filterwarnings("ignore", message="Trying to unpickle estimator")

from pathlib import Path
import os

# CPU OPTIMIZATION: Set PyTorch thread limits before importing anything else
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from api.router import api_router
from api.ws import manager
from core.cors import configure_cors
from core.database import init_db
from core.firebase_admin import initialize_firebase_admin

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
FRONTEND_DEV = "http://localhost:5173"

app = FastAPI(title="Dairy 4.0 Platform API", version="1.0.0")

configure_cors(app)
initialize_firebase_admin()
app.include_router(api_router, prefix="/api")

uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


def mount_frontend() -> None:
    """Serve built frontend or show instructions for dev mode."""
    index = FRONTEND_DIST / "index.html"

    if index.exists():
        if (FRONTEND_DIST / "assets").exists():
            app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="frontend_assets")

        @app.get("/{full_path:path}")
        async def serve_frontend(full_path: str):
            file_path = FRONTEND_DIST / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
            return HTMLResponse(index.read_text(encoding="utf-8"), media_type="text/html")

        print(f"[OK] Serving frontend from {FRONTEND_DIST}")
    else:
        @app.get("/")
        async def frontend_instructions():
            html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Dairy 4.0</title>
<style>
  body {{ font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
         min-height: 100vh; margin: 0; background: #07111f; color: #e7eefb; text-align: center; }}
  a {{ color: #8ddcff; }}
  code {{ background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; }}
</style></head>
<body>
  <div>
    <h1>Dairy 4.0 Platform</h1>
    <p>Backend API is running. Start the frontend:</p>
    <p><code>cd frontend && npm run dev</code></p>
    <p>Then open <a href="{FRONTEND_DEV}">{FRONTEND_DEV}</a></p>
    <p>Or build for production: <code>cd frontend && npm run build</code></p>
    <hr style="opacity:0.2; margin: 24px auto; max-width: 200px;">
    <p style="font-size: 0.875rem; opacity: 0.6;">
      API docs: <a href="/docs">/docs</a> &middot;
      Health: <a href="/healthz">/healthz</a>
    </p>
  </div>
</body></html>"""
            return HTMLResponse(html)

        print(f"[INFO] Frontend dist not found at {FRONTEND_DIST}")
        print(f"  Run: cd frontend && npm run build")
        print(f"  Or start dev server: cd frontend && npm run dev  (-> {FRONTEND_DEV})")


@app.get("/healthz", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


mount_frontend()


@app.on_event("startup")
async def startup_event() -> None:
    init_db()
    print("[OK] SQLite database initialized")

    try:
        from models.vision_inference import get_vision_engine
        from models.inference import DairyInferenceEngine

        vision_engine = get_vision_engine()
        print("[OK] Vision engine (YOLO + ViT) pre-loaded successfully")

        inference_engine = DairyInferenceEngine()
        print("[OK] Inference engine (Health + Production) pre-loaded successfully")
    except Exception as e:
        print(f"[WARN] Could not pre-load models on startup: {e}")
        print("  Models will be loaded on first request (slower first response)")

    from services.data_generator import set_websocket_broadcast, start_generator
    set_websocket_broadcast(manager.broadcast)
    start_generator(app, interval_seconds=5)
    print("[OK] Real-time sensor data generator started (5s interval)")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    from services.data_generator import stop_generator
    stop_generator()
    print("[OK] Real-time sensor data generator stopped")
