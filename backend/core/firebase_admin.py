from __future__ import annotations

import logging
from functools import lru_cache

from core.config import get_backend_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def initialize_firebase_admin():
    settings = get_backend_settings()
    credentials_path = str(settings["firebase_credentials_path"])
    project_id = str(settings["firebase_project_id"])

    try:
        import firebase_admin
        from firebase_admin import credentials
    except Exception as exc:  # pragma: no cover - optional dependency path
        logger.info("Firebase Admin SDK unavailable: %s", exc)
        return None

    if firebase_admin._apps:
        return firebase_admin.get_app()

    if credentials_path:
        cred = credentials.Certificate(credentials_path)
        return firebase_admin.initialize_app(cred, {"projectId": project_id} if project_id else None)

    logger.info("Firebase credentials not configured; running without Admin SDK initialization")
    return None
