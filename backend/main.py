from pathlib import Path

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


@app.get("/healthz", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
