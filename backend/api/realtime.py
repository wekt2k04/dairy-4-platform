from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from api.deps import get_current_user
from core.database import get_cows, get_latest_sensor, get_latest_prediction, get_sensor_history, get_prediction_history, get_anomalies
from services.anomaly_detector import detect_anomalies

router = APIRouter()

COW_NAMES = {
    "cow-001": "Bessie", "cow-002": "Daisy", "cow-003": "Maggie",
    "cow-004": "Rosie", "cow-005": "Clover",
}


@router.get("/cows")
def list_cows(user: str = Depends(get_current_user)) -> list[dict]:
    return get_cows()


@router.get("/cows/{cow_id}/live")
def cow_live_status(cow_id: str, user: str = Depends(get_current_user)) -> dict:
    sensor = get_latest_sensor(cow_id)
    prediction = get_latest_prediction(cow_id)

    sensor_data = sensor or {
        "temperature_c": 38.5, "heart_rate_bpm": 70,
        "rumen_ph": 6.5, "activity_score": 65, "milk_yesterday_liters": 30.0,
    }
    pred_data = prediction or {
        "health_status": "Healthy", "health_score": 85,
        "health_confidence": 0.9, "milk_yield_liters": 30.0,
        "drop_alert": False, "production_confidence": 0.85,
    }

    anomalies = detect_anomalies(
        temperature_c=sensor_data["temperature_c"],
        rumen_ph=sensor_data["rumen_ph"],
    )

    return {
        "cow_id": cow_id,
        "cow_name": COW_NAMES.get(cow_id, cow_id),
        "sensor": sensor_data,
        "health": {
            "health_status": pred_data["health_status"],
            "health_score": pred_data["health_score"],
            "confidence_score": pred_data["health_confidence"],
        },
        "production": {
            "milk_yield_liters": pred_data["milk_yield_liters"],
            "drop_alert": bool(pred_data["drop_alert"]),
            "confidence_score": pred_data["production_confidence"],
        },
        "anomalies": [
            {
                "id": None,
                "type": a.anomaly_type,
                "severity": a.severity,
                "rule_number": a.rule_number,
                "description": a.description,
                "triggered_by": a.triggered_by,
                "exclusion_check": a.exclusion_check,
                "recommendation": a.recommendation,
                "citation": a.scientific_citation,
                "report_available": False,
                "timestamp": a.timestamp,
            }
            for a in anomalies
        ],
        "timestamp": None,
    }


@router.get("/cows/{cow_id}/sensor-history")
def sensor_history(cow_id: str, limit: int = Query(50, ge=1, le=200), user: str = Depends(get_current_user)) -> list[dict]:
    return get_sensor_history(cow_id, limit)


@router.get("/cows/{cow_id}/prediction-history")
def prediction_history(cow_id: str, limit: int = Query(50, ge=1, le=200), user: str = Depends(get_current_user)) -> list[dict]:
    return get_prediction_history(cow_id, limit)
