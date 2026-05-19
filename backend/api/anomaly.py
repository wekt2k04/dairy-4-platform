from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse

from api.deps import get_current_user
from core.database import get_anomalies, get_anomaly_by_id

router = APIRouter()


@router.get("/cows/{cow_id}/anomalies")
def list_anomalies(cow_id: str, limit: int = 50, user: str = Depends(get_current_user)) -> list[dict]:
    return get_anomalies(cow_id, limit)


@router.get("/report/{anomaly_id}")
def download_report(anomaly_id: int, user: str = Depends(get_current_user)):
    anomaly = get_anomaly_by_id(anomaly_id)
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    return PlainTextResponse(
        content=anomaly["report_text"],
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=anomaly_{anomaly_id}.txt"},
    )
