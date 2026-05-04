from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_backend_settings


def configure_cors(app: FastAPI) -> None:
    settings = get_backend_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(settings["frontend_origin"])],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
