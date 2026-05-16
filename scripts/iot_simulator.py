from __future__ import annotations

import argparse
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.firebase_admin import initialize_firebase_admin
from services.firestore import write_prediction_record


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def score_health(temperature_c: float, heart_rate_bpm: int, rumen_ph: float, activity_score: int) -> tuple[str, float, float]:
    temp_penalty = abs(temperature_c - 38.9) * 18.0
    heart_penalty = abs(heart_rate_bpm - 70) * 1.4
    ph_penalty = abs(rumen_ph - 6.4) * 22.0
    activity_penalty = abs(activity_score - 72) * 0.45
    score = clamp(100.0 - (temp_penalty + heart_penalty + ph_penalty + activity_penalty), 0.0, 100.0)

    if score >= 78:
        status = "Healthy"
    elif score >= 50:
        status = "Warning"
    else:
        status = "Critical"

    confidence = clamp(0.58 + (score / 100.0) * 0.35, 0.58, 0.98)
    return status, round(score, 2), round(confidence, 3)


def score_production(milk_yesterday_liters: float, temperature_c: float, rumen_ph: float, activity_score: int) -> tuple[float, bool, float]:
    temperature_factor = 1.0 - abs(temperature_c - 38.9) * 0.025
    ph_factor = 1.0 - abs(rumen_ph - 6.4) * 0.035
    activity_factor = 1.0 - abs(activity_score - 72) * 0.002
    predicted = milk_yesterday_liters * temperature_factor * ph_factor * activity_factor
    predicted = clamp(predicted, milk_yesterday_liters * 0.82, milk_yesterday_liters * 1.06 if milk_yesterday_liters else 0.0)
    drop_alert = bool(milk_yesterday_liters and predicted <= milk_yesterday_liters * 0.85)
    confidence = clamp(0.6 + (predicted / max(milk_yesterday_liters, 1.0)) * 0.2, 0.6, 0.95)
    return round(predicted, 2), drop_alert, round(confidence, 3)


def build_sample(cow_id: str) -> dict[str, object]:
    temperature_c = round(clamp(random.gauss(38.9, 0.15), 38.5, 39.5), 2)
    heart_rate_bpm = int(round(clamp(random.gauss(70, 3.5), 60, 80)))
    rumen_ph = round(clamp(random.gauss(6.42, 0.1), 6.1, 6.8), 2)
    activity_score = int(round(clamp(random.gauss(72, 7), 45, 96)))
    milk_yesterday_liters = round(clamp(random.gauss(31.5, 2.8), 22.0, 42.0), 2)
    time_of_day_hhmm = datetime.now().astimezone().strftime("%H:%M")

    health_status, health_score, health_confidence = score_health(temperature_c, heart_rate_bpm, rumen_ph, activity_score)
    milk_yield_liters, drop_alert, production_confidence = score_production(milk_yesterday_liters, temperature_c, rumen_ph, activity_score)

    prediction_id = f"iot-{uuid4().hex}"
    payload: dict[str, object] = {
        "prediction_id": prediction_id,
        "created_at": now_utc(),
        "source": "iot-simulator",
        "feed_type": "telemetry",
        "cow_id": cow_id,
        "inputs": {
            "temperature_c": temperature_c,
            "heart_rate_bpm": heart_rate_bpm,
            "rumen_ph": rumen_ph,
            "activity_score": activity_score,
            "milk_yesterday_liters": milk_yesterday_liters,
            "time_of_day_hhmm": time_of_day_hhmm,
            "video_url": None,
        },
        "health": {
            "health_status": health_status,
            "health_score": health_score,
            "confidence_score": health_confidence,
        },
        "production": {
            "milk_yield_liters": milk_yield_liters,
            "drop_alert": drop_alert,
            "confidence_score": production_confidence,
        },
        "vision": None,
        "firestore_path": f"predictions/{prediction_id}",
    }
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Push biologically realistic dairy telemetry to Firestore.")
    parser.add_argument("--interval", type=float, default=10.0, help="Seconds between samples.")
    parser.add_argument("--cow-id", default="cow-001", help="Cow identifier to attach to each sample.")
    parser.add_argument("--once", action="store_true", help="Send a single sample and exit.")
    args = parser.parse_args()

    if initialize_firebase_admin() is None:
        raise RuntimeError("Firebase Admin is not configured. Set GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_PROJECT_ID.")

    while True:
        payload = build_sample(args.cow_id)
        record_id = str(payload["prediction_id"])
        write_prediction_record("predictions", payload, document_id=record_id)
        print(f"[{now_utc()}] wrote telemetry for {args.cow_id} -> predictions/{record_id}")

        if args.once:
            break

        time.sleep(max(1.0, args.interval))


if __name__ == "__main__":
    main()
