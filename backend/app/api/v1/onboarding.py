# backend/app/api/v1/onboarding.py
"""Onboarding wizard de destileria — NeoStills v2.

Permite al usuario configurar su destileria en el primer login:
  POST /api/v1/onboarding/setup  — usage_type + still_type + capacity + dims
  GET  /api/v1/onboarding/status — saber si el onboarding esta completo
"""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user, get_current_distillery
from app.core.database import get_db
from app.models.brewery import Distillery, StillType, UsageType
from app.models.user import User

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class OnboardingSetupRequest(BaseModel):
    usage_type: UsageType = Field(..., description="home | professional")
    still_type: Optional[StillType] = Field(None, description="pot_still | column_still | reflux_still | alembic | other")
    still_capacity_liters: Optional[float] = Field(None, gt=0, le=10000, description="Capacidad del alambique en litros")
    distillery_name: Optional[str] = Field(None, min_length=2, max_length=200, description="Nombre de la destileria")
    location: Optional[str] = Field(None, max_length=200, description="Ciudad / Region")
    space_dimensions: Optional[dict[str, Any]] = Field(
        None,
        description="Dimensiones del espacio para Digital Twin: {width_m, depth_m, height_m}"
    )


class OnboardingStatusResponse(BaseModel):
    is_complete: bool
    missing_fields: list[str]
    distillery_id: int
    distillery_name: str
    usage_type: str
    still_type: Optional[str]
    still_capacity_liters: Optional[float]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/setup",
    summary="Configurar destileria tras el primer login",
    status_code=status.HTTP_200_OK,
)
async def onboarding_setup(
    payload: OnboardingSetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    distillery: Distillery = Depends(get_current_distillery),
) -> dict[str, Any]:
    """
    Wizard de onboarding. Actualiza la destileria del usuario con los datos
    del tipo de equipamiento, capacidad y espacio de trabajo.
    """
    if payload.distillery_name:
        distillery.name = payload.distillery_name
    if payload.usage_type:
        distillery.usage_type = payload.usage_type
    if payload.still_type is not None:
        distillery.still_type = payload.still_type
    if payload.still_capacity_liters is not None:
        distillery.still_capacity_liters = payload.still_capacity_liters
    if payload.location is not None:
        distillery.location = payload.location
    if payload.space_dimensions is not None:
        # Validar dimensiones minimas
        dims = payload.space_dimensions
        for dim in ("width_m", "depth_m", "height_m"):
            if dim in dims and dims[dim] <= 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"space_dimensions.{dim} debe ser positivo.",
                )
        distillery.space_dimensions = dims

    db.add(distillery)
    await db.commit()
    await db.refresh(distillery)

    return {
        "success": True,
        "distillery_id": distillery.id,
        "distillery_name": distillery.name,
        "usage_type": distillery.usage_type,
        "still_type": distillery.still_type,
        "still_capacity_liters": distillery.still_capacity_liters,
        "onboarding_complete": _is_onboarding_complete(distillery),
        "message": "Destileria configurada correctamente.",
    }


@router.get(
    "/status",
    response_model=OnboardingStatusResponse,
    summary="Estado del onboarding",
)
async def onboarding_status(
    current_user: User = Depends(get_current_user),
    distillery: Distillery = Depends(get_current_distillery),
) -> OnboardingStatusResponse:
    missing = _get_missing_fields(distillery)
    return OnboardingStatusResponse(
        is_complete=len(missing) == 0,
        missing_fields=missing,
        distillery_id=distillery.id,
        distillery_name=distillery.name,
        usage_type=distillery.usage_type.value if distillery.usage_type else "home",
        still_type=distillery.still_type.value if distillery.still_type else None,
        still_capacity_liters=distillery.still_capacity_liters,
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_missing_fields(distillery: Distillery) -> list[str]:
    missing = []
    if not distillery.still_type:
        missing.append("still_type")
    if not distillery.still_capacity_liters:
        missing.append("still_capacity_liters")
    return missing


def _is_onboarding_complete(distillery: Distillery) -> bool:
    return len(_get_missing_fields(distillery)) == 0
