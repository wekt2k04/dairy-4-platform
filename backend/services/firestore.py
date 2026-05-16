from __future__ import annotations

import logging
from uuid import uuid4
from typing import Any

logger = logging.getLogger(__name__)


def write_prediction_record(collection_name: str, payload: dict[str, Any], document_id: str | None = None) -> str:
    record_id = document_id or uuid4().hex

    try:
        from core.firebase_admin import initialize_firebase_admin

        initialize_firebase_admin()
        import firebase_admin
        from firebase_admin import firestore
    except Exception as exc:  # pragma: no cover - optional dependency path
        logger.info("Firestore unavailable: %s", exc)
        return record_id

    if not firebase_admin._apps:
        logger.info("Firebase Admin not initialized; skipping Firestore write")
        return record_id

    client = firestore.client()
    client.collection(collection_name).document(record_id).set(payload)
    return record_id
