from fastapi import APIRouter, Depends

from api.deps import get_current_user
from schemas.health import HealthInput, HealthPredictionResponse
from schemas.production import ProductionInput, ProductionPredictionResponse
from schemas.simulation import FullSimulationInput, FullSimulationResponse
from services.predictions import predict_health, predict_milk_production, run_full_simulation

router = APIRouter()


@router.post("/health", response_model=HealthPredictionResponse)
def predict_health_endpoint(payload: HealthInput, user: str = Depends(get_current_user)) -> HealthPredictionResponse:
    return predict_health(payload)


@router.post("/production", response_model=ProductionPredictionResponse)
async def predict_production_endpoint(payload: ProductionInput, user: str = Depends(get_current_user)) -> ProductionPredictionResponse:
    return await predict_milk_production(payload)


@router.post("/full-simulation", response_model=FullSimulationResponse)
async def full_simulation_endpoint(payload: FullSimulationInput, user: str = Depends(get_current_user)) -> FullSimulationResponse:
    return await run_full_simulation(payload)
