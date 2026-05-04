from __future__ import annotations

import os
from functools import lru_cache


@lru_cache(maxsize=1)
def get_backend_settings() -> dict[str, object]:
    return {
        "frontend_origin": os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
        "firebase_project_id": os.getenv("FIREBASE_PROJECT_ID", ""),
        "firebase_credentials_path": os.getenv("GOOGLE_APPLICATION_CREDENTIALS", ""),
        "model_weights_dir": os.getenv(
            "MODEL_WEIGHTS_DIR",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "weights"),
        ),
    }
