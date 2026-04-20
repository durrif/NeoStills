# backend/app/api/v1/calculators.py
"""Endpoints de calculadoras de destilacion - NeoStills v2."""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models.user import User
from app.services.distillation_calculators import (
    calculate_dilution,
    calculate_wash_abv,
    calculate_fermentation_yield,
    estimate_cuts,
    get_mash_profile,
    FERMENTABLE_DATABASE,
    MASH_PROFILES,
    CutPoints,
)

router = APIRouter(prefix="/calculators", tags=["calculators"])


class DilutionRequest(BaseModel):
    initial_abv: float = Field(..., gt=0, le=100)
    initial_volume_liters: float = Field(..., gt=0)
    target_abv: float = Field(..., gt=0, le=100)


class WashAbvRequest(BaseModel):
    og: float = Field(..., gt=1.0, le=1.2)
    fg: float = Field(..., gt=0.98, le=1.1)


class FermentationYieldRequest(BaseModel):
    fermentable_type: str
    amount_kg: float = Field(..., gt=0)
    wash_volume_liters: float = Field(..., gt=0)
    custom_brix: Optional[float] = Field(None, ge=0, le=30)


class CutsRequest(BaseModel):
    wash_volume_liters: float = Field(..., gt=0)
    wash_abv: float = Field(..., gt=0, le=20)
    cut_points: Optional[dict[str, float]] = None


@router.post("/dilution", summary="Calcular dilucion C1V1=C2V2")
async def dilution_calculator(
    payload: DilutionRequest,
    _: User = Depends(get_current_user),
) -> dict[str, Any]:
    if payload.target_abv >= payload.initial_abv:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El ABV objetivo debe ser menor que el ABV inicial.",
        )
    try:
        result = calculate_dilution(
            payload.initial_abv, payload.initial_volume_liters, payload.target_abv
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return {
        "water_to_add_liters": result["water_to_add_liters"],
        "final_volume_liters": result["final_volume_liters"],
        "initial_abv": payload.initial_abv,
        "target_abv": payload.target_abv,
        "initial_volume_liters": payload.initial_volume_liters,
    }


@router.post("/wash-abv", summary="Calcular ABV del wash (OG/FG)")
async def wash_abv_calculator(
    payload: WashAbvRequest,
    _: User = Depends(get_current_user),
) -> dict[str, Any]:
    if payload.fg >= payload.og:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La FG debe ser menor que la OG.",
        )
    try:
        abv = calculate_wash_abv(payload.og, payload.fg)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    attenuation = (
        round(((payload.og - payload.fg) / (payload.og - 1.0)) * 100, 1)
        if payload.og > 1.0
        else 0.0
    )
    return {"abv": abv, "og": payload.og, "fg": payload.fg, "attenuation_pct": attenuation}


@router.post("/fermentation-yield", summary="Estimar rendimiento de fermentacion")
async def fermentation_yield_calculator(
    payload: FermentationYieldRequest,
    _: User = Depends(get_current_user),
) -> dict[str, Any]:
    if payload.fermentable_type not in FERMENTABLE_DATABASE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Fermentable no reconocido: '{payload.fermentable_type}'. "
                f"Validos: {', '.join(FERMENTABLE_DATABASE.keys())}"
            ),
        )
    try:
        return calculate_fermentation_yield(
            fermentable_type=payload.fermentable_type,
            amount_kg=payload.amount_kg,
            wash_volume_liters=payload.wash_volume_liters,
            custom_brix=payload.custom_brix,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.post("/cuts", summary="Estimar cortes heads/hearts/tails")
async def cuts_estimator(
    payload: CutsRequest,
    _: User = Depends(get_current_user),
) -> dict[str, Any]:
    cp = None
    if payload.cut_points:
        cp = CutPoints(
            heads_end_temp_c=payload.cut_points.get("heads_end_temp_c", 78.0),
            hearts_end_temp_c=payload.cut_points.get("hearts_end_temp_c", 93.0),
            heads_abv_threshold=payload.cut_points.get("heads_abv_threshold", 75.0),
            tails_abv_threshold=payload.cut_points.get("tails_abv_threshold", 40.0),
        )
    try:
        return estimate_cuts(payload.wash_volume_liters, payload.wash_abv, cp)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get("/mash-profile/{cereal_type}", summary="Perfil de macerado por cereal")
async def mash_profile(
    cereal_type: str,
    amount_kg: float = 10.0,
    water_liters: float = 30.0,
    _: User = Depends(get_current_user),
) -> dict[str, Any]:
    if cereal_type not in MASH_PROFILES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Cereal '{cereal_type}' no encontrado. "
                f"Disponibles: {', '.join(MASH_PROFILES.keys())}"
            ),
        )
    try:
        return get_mash_profile(cereal_type, amount_kg, water_liters)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get("/fermentables", summary="Listar fermentables disponibles")
async def list_fermentables(_: User = Depends(get_current_user)) -> dict[str, Any]:
    return {
        key: {
            "name": spec.name,
            "sugar_content_pct": spec.sugar_content_pct,
            "fermentation_yield_pct": spec.fermentation_yield_pct,
        }
        for key, spec in FERMENTABLE_DATABASE.items()
    }
