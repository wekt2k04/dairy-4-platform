from pathlib import Path
import os

# CPU OPTIMIZATION: Set PyTorch thread limits before importing anything else
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.router import api_router
from core.cors import configure_cors
from core.firebase_admin import initialize_firebase_admin

app = FastAPI(title="Dairy 4.0 Platform API", version="1.0.0")

configure_cors(app)
initialize_firebase_admin()
app.include_router(api_router, prefix="/api")

uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.on_event("startup")
async def startup_event() -> None:
    """
    PRE-LOAD all models on app startup to avoid lazy loading delays on first request.
    This ensures optimal performance for the first prediction request.
    """
    try:
        from models.vision_inference import get_vision_engine
        from models.inference import DairyInferenceEngine
        
        # Pre-load vision engine (YOLO + ViT models)
        vision_engine = get_vision_engine()
        print("✓ Vision engine (YOLO + ViT) pre-loaded successfully")
        
        # Pre-load inference engine (Health + Production models)
        inference_engine = DairyInferenceEngine()
        print("✓ Inference engine (Health + Production) pre-loaded successfully")
    except Exception as e:
        print(f"⚠ Warning: Could not pre-load models on startup: {e}")
        print("  Models will be loaded on first request (slower first response)")


@app.get("/healthz", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
