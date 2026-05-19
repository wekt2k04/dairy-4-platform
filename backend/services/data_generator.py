from __future__ import annotations

import asyncio
import random
from datetime import datetime, timezone

from core.database import add_cow, get_cows, insert_anomaly, insert_sensor_reading, insert_prediction
from models.inference import DairyInferenceEngine
from schemas.health import HealthInput
from schemas.production import ProductionInput
from services.anomaly_detector import detect_anomalies

_engine = DairyInferenceEngine()
_running = False

COW_DEFINITIONS = [
    {"cow_id": "cow-001", "name": "Bessie", "breed": "Holstein"},
    {"cow_id": "cow-002", "name": "Daisy", "breed": "Jersey"},
    {"cow_id": "cow-003", "name": "Maggie", "breed": "Holstein"},
    {"cow_id": "cow-004", "name": "Rosie", "breed": "Guernsey"},
    {"cow_id": "cow-005", "name": "Clover", "breed": "Ayrshire"},
]

BASE_VITALS: dict[str, dict] = {
    "cow-001": {"temp": 38.5, "hr": 72, "ph": 6.5, "activity": 70, "milk": 32.0},
    "cow-002": {"temp": 38.7, "hr": 68, "ph": 6.3, "activity": 65, "milk": 28.5},
    "cow-003": {"temp": 38.3, "hr": 75, "ph": 6.6, "activity": 78, "milk": 34.0},
    "cow-004": {"temp": 38.6, "hr": 70, "ph": 6.4, "activity": 72, "milk": 30.0},
    "cow-005": {"temp": 38.4, "hr": 74, "ph": 6.2, "activity": 68, "milk": 29.5},
}

_current_state: dict[str, dict] = {}


def _init_cows() -> None:
    for cow in COW_DEFINITIONS:
        add_cow(cow["cow_id"], cow["name"], cow["breed"])
    for cow_id, vitals in BASE_VITALS.items():
        _current_state[cow_id] = {
            "temp": vitals["temp"], "hr": vitals["hr"], "ph": vitals["ph"],
            "activity": vitals["activity"], "milk": vitals["milk"],
        }


def _generate_sensor_values(cow_id: str) -> dict:
    base = _current_state.get(cow_id, BASE_VITALS["cow-001"])
    temp = base["temp"] + random.uniform(-0.3, 0.3)
    temp = round(max(37.0, min(41.0, temp)), 1)
    hr = base["hr"] + random.randint(-5, 5)
    hr = max(50, min(120, hr))
    ph = base["ph"] + random.uniform(-0.15, 0.15)
    ph = round(max(5.5, min(7.5, ph)), 1)
    activity = base["activity"] + random.randint(-8, 8)
    activity = max(10, min(100, activity))
    milk = base["milk"] + random.uniform(-0.5, 0.5)
    milk = round(max(15.0, min(55.0, milk)), 1)
    _current_state[cow_id].update({"temp": temp, "hr": hr, "ph": ph, "activity": activity, "milk": milk})
    return {"temperature_c": temp, "heart_rate_bpm": hr, "rumen_ph": ph, "activity_score": activity, "milk_yesterday_liters": milk}


def _compute_predictions(cow_id: str, values: dict) -> dict:
    now = datetime.now(timezone.utc)
    hour = now.hour
    minute = now.minute
    time_str = f"{hour:02d}:{minute:02d}"

    health_input = HealthInput(
        temperature_c=values["temperature_c"],
        heart_rate_bpm=values["heart_rate_bpm"],
        rumen_ph=values["rumen_ph"],
        activity_score=values["activity_score"],
    )
    prod_input = ProductionInput(
        temperature_c=values["temperature_c"],
        heart_rate_bpm=values["heart_rate_bpm"],
        rumen_ph=values["rumen_ph"],
        activity_score=values["activity_score"],
        milk_yesterday_liters=values["milk_yesterday_liters"],
        time_of_day_hhmm=time_str,
    )

    health_result = _engine.predict_health(health_input)
    prod_result = _engine.predict_production(prod_input)

    return {
        "health_status": health_result.health_status,
        "health_score": health_result.health_score,
        "health_confidence": health_result.confidence_score,
        "milk_yield_liters": prod_result.milk_yield_liters,
        "drop_alert": prod_result.drop_alert,
        "production_confidence": prod_result.confidence_score,
    }


async def _simulation_loop(interval_seconds: int = 5) -> None:
    global _running
    _running = True
    _init_cows()

    while _running:
        try:
            cows = get_cows()
            if not cows:
                await asyncio.sleep(interval_seconds)
                continue

            results = []
            for cow in cows:
                cow_id = cow["cow_id"]
                values = _generate_sensor_values(cow_id)

                insert_sensor_reading(
                    cow_id=cow_id,
                    temperature_c=values["temperature_c"],
                    heart_rate_bpm=values["heart_rate_bpm"],
                    rumen_ph=values["rumen_ph"],
                    activity_score=values["activity_score"],
                    milk_yesterday_liters=values["milk_yesterday_liters"],
                )
                predictions = _compute_predictions(cow_id, values)
                insert_prediction(
                    cow_id=cow_id,
                    health_status=predictions["health_status"],
                    health_score=predictions["health_score"],
                    health_confidence=predictions["health_confidence"],
                    milk_yield_liters=predictions["milk_yield_liters"],
                    drop_alert=predictions["drop_alert"],
                    production_confidence=predictions["production_confidence"],
                )

                anomalies = detect_anomalies(
                    temperature_c=values["temperature_c"],
                    rumen_ph=values["rumen_ph"],
                )

                anomaly_list = []
                for a in anomalies:
                    from services.anomaly_detector import generate_report_text
                    report_text = generate_report_text(a, cow["name"], cow_id)
                    anomaly_id = insert_anomaly(
                        cow_id=cow_id,
                        anomaly_type=a.anomaly_type,
                        severity=a.severity,
                        rule_number=a.rule_number,
                        description=a.description,
                        triggered_by=str(a.triggered_by),
                        exclusion_check=a.exclusion_check,
                        recommendation=a.recommendation,
                        citation=a.scientific_citation,
                        report_text=report_text,
                    )
                    anomaly_list.append({
                        "id": anomaly_id,
                        "type": a.anomaly_type,
                        "severity": a.severity,
                        "rule_number": a.rule_number,
                        "description": a.description,
                        "triggered_by": a.triggered_by,
                        "exclusion_check": a.exclusion_check,
                        "recommendation": a.recommendation,
                        "citation": a.scientific_citation,
                        "report_available": anomaly_id is not None,
                        "timestamp": a.timestamp,
                    })

                results.append({
                    "cow_id": cow_id,
                    "cow_name": cow["name"],
                    "sensor": values,
                    "health": {
                        "health_status": predictions["health_status"],
                        "health_score": predictions["health_score"],
                        "confidence_score": predictions["health_confidence"],
                    },
                    "production": {
                        "milk_yield_liters": predictions["milk_yield_liters"],
                        "drop_alert": predictions["drop_alert"],
                        "confidence_score": predictions["production_confidence"],
                    },
                    "anomalies": anomaly_list,
                    "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                })

            if _websocket_broadcast:
                await _websocket_broadcast(results)

        except Exception as e:
            print(f"[DataGenerator] Error in simulation loop: {e}")

        await asyncio.sleep(interval_seconds)


_websocket_broadcast = None


def set_websocket_broadcast(coro):
    global _websocket_broadcast
    _websocket_broadcast = coro


def start_generator(app, interval_seconds: int = 5) -> asyncio.Task:
    loop = asyncio.get_event_loop()
    task = loop.create_task(_simulation_loop(interval_seconds))
    return task


def stop_generator() -> None:
    global _running
    _running = False
