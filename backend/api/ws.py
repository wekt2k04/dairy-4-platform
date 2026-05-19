from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from core.firebase_admin import initialize_firebase_admin


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, data: list[dict[str, Any]]) -> None:
        dead: set[WebSocket] = set()
        async with self._lock:
            for ws in self._connections:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.add(ws)
            self._connections -= dead


manager = ConnectionManager()
router = APIRouter()


def _verify_ws_token(token: str | None) -> bool:
    """Verify Firebase ID token for WebSocket connections."""
    app = initialize_firebase_admin()
    if app is None or not token:
        return app is None  # allow in dev mode if Firebase not configured
    try:
        from firebase_admin import auth
        auth.verify_id_token(token)
        return True
    except Exception:
        return False


@router.websocket("/dashboard")
async def dashboard_websocket(websocket: WebSocket, token: str | None = Query(None)) -> None:
    if not _verify_ws_token(token):
        await websocket.close(code=4001, reason="Unauthorized")
        return
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)
