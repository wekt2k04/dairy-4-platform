from fastapi import APIRouter, HTTPException, status
from typing import Literal
from pydantic import BaseModel, Field

router = APIRouter()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    success: bool
    token: str
    token_type: str = "bearer"
    auth_mode: Literal["Mock/Demo"] = "Mock/Demo"


@router.post("/mock-login", response_model=LoginResponse)
def mock_login(payload: LoginRequest) -> LoginResponse:
    if payload.username != "admin" or payload.password != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return LoginResponse(success=True, token="mock-jwt-dairy-4-platform")
