from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.firebase_admin import initialize_firebase_admin

security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    """Verify Firebase ID token from Authorization header.

    Returns user UID on success.
    If Firebase Admin is not configured (dev mode), returns a placeholder.
    """
    app = initialize_firebase_admin()
    if app is None:
        return "dev-user"

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(credentials.credentials)
        return decoded["uid"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def optional_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str | None:
    """Like get_current_user but returns None instead of 401 if no token."""
    app = initialize_firebase_admin()
    if app is None or credentials is None:
        return None
    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(credentials.credentials)
        return decoded["uid"]
    except Exception:
        return None
