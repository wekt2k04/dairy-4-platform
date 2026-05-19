from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "dairy.db"
_lock = Lock()


def get_connection() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS virtual_cows (
            cow_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            breed TEXT NOT NULL DEFAULT 'Holstein',
            birth_date TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cow_id TEXT NOT NULL,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            temperature_c REAL NOT NULL,
            heart_rate_bpm INTEGER NOT NULL,
            rumen_ph REAL NOT NULL,
            activity_score INTEGER NOT NULL,
            milk_yesterday_liters REAL NOT NULL DEFAULT 30.0,
            FOREIGN KEY (cow_id) REFERENCES virtual_cows(cow_id)
        );

        CREATE TABLE IF NOT EXISTS prediction_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cow_id TEXT NOT NULL,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            health_status TEXT NOT NULL,
            health_score REAL NOT NULL,
            health_confidence REAL NOT NULL,
            milk_yield_liters REAL NOT NULL,
            drop_alert INTEGER NOT NULL DEFAULT 0,
            production_confidence REAL NOT NULL,
            FOREIGN KEY (cow_id) REFERENCES virtual_cows(cow_id)
        );

        CREATE INDEX IF NOT EXISTS idx_sensor_time ON sensor_readings(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_sensor_cow_time ON sensor_readings(cow_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_prediction_cow_time ON prediction_results(cow_id, timestamp DESC);

        CREATE TABLE IF NOT EXISTS anomaly_detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cow_id TEXT NOT NULL,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            anomaly_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            rule_number INTEGER NOT NULL,
            description TEXT NOT NULL,
            triggered_by TEXT NOT NULL,
            exclusion_check TEXT,
            recommendation TEXT NOT NULL,
            citation TEXT,
            report_text TEXT NOT NULL,
            FOREIGN KEY (cow_id) REFERENCES virtual_cows(cow_id)
        );

        CREATE INDEX IF NOT EXISTS idx_anomaly_cow_time ON anomaly_detections(cow_id, timestamp DESC);
    """)
    conn.commit()
    conn.close()


# --- Cow & sensor operations ---

def add_cow(cow_id: str, name: str, breed: str = "Holstein") -> None:
    with _lock:
        conn = get_connection()
        conn.execute(
            "INSERT OR IGNORE INTO virtual_cows (cow_id, name, breed) VALUES (?, ?, ?)",
            (cow_id, name, breed),
        )
        conn.commit()
        conn.close()


def get_cows() -> list[dict]:
    with _lock:
        conn = get_connection()
        rows = conn.execute("SELECT * FROM virtual_cows ORDER BY name").fetchall()
        conn.close()
        return [dict(r) for r in rows]


def insert_sensor_reading(
    cow_id: str,
    temperature_c: float,
    heart_rate_bpm: int,
    rumen_ph: float,
    activity_score: int,
    milk_yesterday_liters: float,
) -> int:
    with _lock:
        conn = get_connection()
        cur = conn.execute(
            """INSERT INTO sensor_readings
               (cow_id, timestamp, temperature_c, heart_rate_bpm, rumen_ph, activity_score, milk_yesterday_liters)
               VALUES (?, datetime('now'), ?, ?, ?, ?, ?)""",
            (cow_id, temperature_c, heart_rate_bpm, rumen_ph, activity_score, milk_yesterday_liters),
        )
        conn.commit()
        row_id = cur.lastrowid
        conn.close()
        return row_id


def insert_prediction(
    cow_id: str,
    health_status: str,
    health_score: float,
    health_confidence: float,
    milk_yield_liters: float,
    drop_alert: bool,
    production_confidence: float,
) -> int:
    with _lock:
        conn = get_connection()
        cur = conn.execute(
            """INSERT INTO prediction_results
               (cow_id, timestamp, health_status, health_score, health_confidence, milk_yield_liters, drop_alert, production_confidence)
               VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)""",
            (cow_id, health_status, health_score, health_confidence, milk_yield_liters, int(drop_alert), production_confidence),
        )
        conn.commit()
        row_id = cur.lastrowid
        conn.close()
        return row_id


def get_latest_sensor(cow_id: str) -> dict | None:
    with _lock:
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM sensor_readings WHERE cow_id = ? ORDER BY timestamp DESC LIMIT 1",
            (cow_id,),
        ).fetchone()
        conn.close()
        return dict(row) if row else None


def get_latest_prediction(cow_id: str) -> dict | None:
    with _lock:
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM prediction_results WHERE cow_id = ? ORDER BY timestamp DESC LIMIT 1",
            (cow_id,),
        ).fetchone()
        conn.close()
        return dict(row) if row else None


def get_sensor_history(cow_id: str, limit: int = 50) -> list[dict]:
    with _lock:
        conn = get_connection()
        rows = conn.execute(
            "SELECT * FROM sensor_readings WHERE cow_id = ? ORDER BY timestamp DESC LIMIT ?",
            (cow_id, limit),
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]


def get_prediction_history(cow_id: str, limit: int = 50) -> list[dict]:
    with _lock:
        conn = get_connection()
        rows = conn.execute(
            "SELECT * FROM prediction_results WHERE cow_id = ? ORDER BY timestamp DESC LIMIT ?",
            (cow_id, limit),
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]


# --- Anomaly operations ---

def insert_anomaly(
    cow_id: str,
    anomaly_type: str,
    severity: str,
    rule_number: int,
    description: str,
    triggered_by: str,
    exclusion_check: str | None,
    recommendation: str,
    citation: str | None,
    report_text: str,
) -> int | None:
    with _lock:
        conn = get_connection()
        try:
            cur = conn.execute(
                """INSERT INTO anomaly_detections
                   (cow_id, timestamp, anomaly_type, severity, rule_number, description, triggered_by, exclusion_check, recommendation, citation, report_text)
                   VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (cow_id, anomaly_type, severity, rule_number, description, triggered_by, exclusion_check, recommendation, citation, report_text),
            )
            conn.commit()
            return cur.lastrowid
        except Exception:
            return None
        finally:
            conn.close()


def get_anomalies(cow_id: str, limit: int = 50) -> list[dict]:
    with _lock:
        conn = get_connection()
        rows = conn.execute(
            "SELECT * FROM anomaly_detections WHERE cow_id = ? ORDER BY timestamp DESC LIMIT ?",
            (cow_id, limit),
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]


def get_anomaly_by_id(anomaly_id: int) -> dict | None:
    with _lock:
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM anomaly_detections WHERE id = ?", (anomaly_id,)
        ).fetchone()
        conn.close()
        return dict(row) if row else None
