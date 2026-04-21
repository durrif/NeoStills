# backend/app/api/v1/onboarding.py
"""Onboarding wizard de destileria — NeoStills v2."""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user, get_current_distillery
from app.core.database import get_db
from app.models.brewery import Distillery, StillType, UsageType
from app.models.ingredient import Ingredient, IngredientCategory, IngredientUnit
from app.models.user import User

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class OnboardingSetupRequest(BaseModel):
    usage_type: UsageType = Field(..., description="home | professional")
    still_type: Optional[StillType] = Field(None)
    still_capacity_liters: Optional[float] = Field(None, gt=0, le=10000)
    distillery_name: Optional[str] = Field(None, min_length=2, max_length=200)
    location: Optional[str] = Field(None, max_length=200)
    space_dimensions: Optional[dict[str, Any]] = Field(None)
    water_profile_id: Optional[str] = Field(None, description="Perfil de agua (paso 4)")
    starter_pack: Optional[str] = Field(None, description="Pack inicial: none | whiskey | gin | rum")


class OnboardingStatusResponse(BaseModel):
    is_complete: bool
    missing_fields: list[str]
    distillery_id: int
    distillery_name: str
    usage_type: str
    still_type: Optional[str]
    still_capacity_liters: Optional[float]
    location: Optional[str] = None
    space_dimensions: Optional[dict[str, Any]] = None


STARTER_PACKS = {
    "whiskey": [
        {"name": "Cebada Pale Malt", "category": "cereal_base", "quantity": 10, "unit": "kg"},
        {"name": "Levadura Distiller's", "category": "levadura", "quantity": 50, "unit": "g"},
        {"name": "Agua destilada", "category": "agua_quimica", "quantity": 50, "unit": "l"},
    ],
    "gin": [
        {"name": "Alcohol neutro 95%", "category": "cereal_especial", "quantity": 5, "unit": "l"},
        {"name": "Enebro", "category": "botanico", "quantity": 100, "unit": "g"},
        {"name": "Cilantro", "category": "botanico", "quantity": 50, "unit": "g"},
        {"name": "Angelica root", "category": "botanico", "quantity": 30, "unit": "g"},
    ],
    "rum": [
        {"name": "Azúcar de caña", "category": "azucar", "quantity": 10, "unit": "kg"},
        {"name": "Levadura de caña", "category": "levadura", "quantity": 50, "unit": "g"},
        {"name": "Agua destilada", "category": "agua_quimica", "quantity": 50, "unit": "l"},
    ],
}


@router.post("/setup", summary="Configurar destileria tras el primer login", status_code=status.HTTP_200_OK)
async def onboarding_setup(
    payload: OnboardingSetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Wizard de onboarding. Crea o actualiza la destileria y seed ingredientes iniciales."""
    result = await db.execute(select(Distillery).where(Distillery.owner_id == current_user.id))
    distillery = result.scalar_one_or_none()
    
    if distillery is None:
        distillery = Distillery(
            owner_id=current_user.id,
            name=payload.distillery_name or f"Distillery of {current_user.full_name}",
            usage_type=payload.usage_type or UsageType.home,
        )
        db.add(distillery)
    
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
        dims = payload.space_dimensions
        for dim in ("width_m", "depth_m", "height_m"):
            if dim in dims and dims[dim] <= 0:
                raise HTTPException(status_code=422, detail=f"space_dimensions.{dim} debe ser positivo.")
        distillery.space_dimensions = dims
    if payload.water_profile_id is not None:
        distillery.water_profile_id = payload.water_profile_id
    if payload.starter_pack is not None:
        distillery.starter_pack = payload.starter_pack

    _validate_professional_space_dimensions(payload.usage_type or distillery.usage_type, 
                                            payload.space_dimensions or distillery.space_dimensions)

    db.add(distillery)
    await db.commit()
    await db.refresh(distillery)

    # SEEDING: Crear ingredientes iniciales si starter_pack != "none"
    if payload.starter_pack and payload.starter_pack != "none":
        await _seed_starter_pack(db, distillery, payload.starter_pack)

    return {
        "success": True,
        "distillery_id": distillery.id,
        "distillery_name": distillery.name,
        "usage_type": distillery.usage_type,
        "still_type": distillery.still_type,
        "still_capacity_liters": distillery.still_capacity_liters,
        "location": distillery.location,
        "space_dimensions": distillery.space_dimensions,
        "water_profile_id": distillery.water_profile_id,
        "starter_pack": distillery.starter_pack,
        "onboarding_complete": _is_onboarding_complete(distillery),
        "message": "Destileria configurada correctamente.",
    }


@router.get("/status", response_model=OnboardingStatusResponse, summary="Estado del onboarding")
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
        location=distillery.location,
        space_dimensions=distillery.space_dimensions,
    )


async def _seed_starter_pack(db: AsyncSession, distillery: Distillery, pack_name: str) -> None:
    """Crear ingredientes iniciales basados en el starter pack."""
    pack_items = STARTER_PACKS.get(pack_name, [])
    for item in pack_items:
        ingredient = Ingredient(
            distillery_id=distillery.id,
            name=item["name"],
            category=IngredientCategory(item["category"]),
            quantity=item["quantity"],
            unit=IngredientUnit(item["unit"]),
        )
        db.add(ingredient)
    if pack_items:
        await db.commit()


def _get_missing_fields(distillery: Distillery) -> list[str]:
    missing = []
    if not distillery.still_type:
        missing.append("still_type")
    if not distillery.still_capacity_liters:
        missing.append("still_capacity_liters")
    try:
        _validate_professional_space_dimensions(distillery.usage_type, distillery.space_dimensions)
    except HTTPException:
        missing.append("space_dimensions")
    return missing


def _validate_professional_space_dimensions(usage_type: UsageType, space_dimensions: Optional[dict]) -> None:
    """Validar que professional tenga dimensiones válidas."""
    if usage_type == UsageType.professional:
        if not space_dimensions:
            raise HTTPException(status_code=422, detail="Professional distilleries require space dimensions")
        required_keys = {"width_m", "depth_m", "height_m"}
        if not required_keys.issubset(space_dimensions.keys()):
            raise HTTPException(status_code=422, detail=f"Missing keys: {required_keys}")
        for dim in required_keys:
            if space_dimensions[dim] <= 0:
                raise HTTPException(status_code=422, detail=f"space_dimensions.{dim} must be positive")


def _is_onboarding_complete(distillery: Distillery) -> bool:
    """Determinar si el onboarding está completo."""
    return bool(
        distillery.still_type
        and distillery.still_capacity_liters
        and (distillery.usage_type != UsageType.professional or distillery.space_dimensions)
    )
