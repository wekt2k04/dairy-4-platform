from fastapi import APIRouter

from schemas.health import HealthInput, HealthPredictionResponse
from schemas.production import ProductionInput, ProductionPredictionResponse
from services.predictions import predict_health, predict_milk_production

router = APIRouter()


@router.post("/health", response_model=HealthPredictionResponse)
def predict_health_endpoint(payload: HealthInput) -> HealthPredictionResponse:
    return predict_health(payload)


@router.post("/production", response_model=ProductionPredictionResponse)
async def predict_production_endpoint(payload: ProductionInput) -> ProductionPredictionResponse:
    return await predict_milk_production(payload)
