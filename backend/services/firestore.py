from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def write_prediction_record(collection_name: str, payload: dict[str, Any]) -> None:
    try:
        import firebase_admin
        from firebase_admin import firestore
    except Exception as exc:  # pragma: no cover - optional dependency path
        logger.info("Firestore unavailable: %s", exc)
        return

    if not firebase_admin._apps:
        logger.info("Firebase Admin not initialized; skipping Firestore write")
        return

    client = firestore.client()
    client.collection(collection_name).add(payload)