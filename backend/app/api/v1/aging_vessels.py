# backend/app/api/v1/aging_vessels.py
"""CRUD de barricas y depósitos de envejecimiento."""
from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_distillery
from app.core.database import get_db
from app.models.aging_vessel import AgingVessel, VesselStatus, VesselType
from app.models.brewery import Distillery
from app.models.user import User
from app.schemas.aging_vessel import (
    AgingVesselCreate,
    AgingVesselOut,
    AgingVesselUpdate,
    SamplingEntry,
)

router = APIRouter(prefix="/aging-vessels", tags=["aging-vessels"])


def _compute_derived(vessel: AgingVessel) -> AgingVesselOut:
    """Añade campos calculados (fill_pct, age_months) antes de serializar."""
    fill_pct = 0.0
    if vessel.capacity_liters > 0:
        fill_pct = round(vessel.current_volume_liters / vessel.capacity_liters * 100, 1)

    age_months: Optional[int] = None
    if vessel.fill_date:
        try:
            fill_dt = date.fromisoformat(vessel.fill_date)
            today = date.today()
            age_months = (today.year - fill_dt.year) * 12 + (today.month - fill_dt.month)
        except ValueError:
            pass

    data = {
        "id": str(vessel.id),
        "distillery_id": str(vessel.distillery_id),
        "code": vessel.code,
        "name": vessel.name,
        "notes": vessel.notes,
        "vessel_type": vessel.vessel_type,
        "wood_type": vessel.wood_type,
        "toast_level": vessel.toast_level,
        "capacity_liters": vessel.capacity_liters,
        "current_volume_liters": vessel.current_volume_liters,
        "current_abv": vessel.current_abv,
        "fill_pct": fill_pct,
        "spirit_type": vessel.spirit_type,
        "spirit_name": vessel.spirit_name,
        "source_batch_id": str(vessel.source_batch_id) if vessel.source_batch_id else None,
        "status": vessel.status,
        "fill_date": vessel.fill_date,
        "target_date": vessel.target_date,
        "age_months": age_months,
        "location_row": vessel.location_row,
        "location_position": vessel.location_position,
        "location_notes": vessel.location_notes,
        "samplings": vessel.samplings or [],
        "aging_techniques": vessel.aging_techniques,
        "created_at": vessel.created_at,
        "updated_at": vessel.updated_at,
    }
    return AgingVesselOut.model_validate(data)


@router.get("", response_model=List[AgingVesselOut])
async def list_vessels(
    status_filter: Optional[VesselStatus] = Query(None, alias="status"),
    vessel_type: Optional[VesselType] = None,
    spirit_type: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    filters = [AgingVessel.distillery_id == distillery.id]
    if status_filter:
        filters.append(AgingVessel.status == status_filter)
    if vessel_type:
        filters.append(AgingVessel.vessel_type == vessel_type)
    if spirit_type:
        filters.append(AgingVessel.spirit_type.ilike(f"%{spirit_type}%"))

    result = await db.execute(
        select(AgingVessel).where(*filters).order_by(AgingVessel.code)
    )
    vessels = result.scalars().all()
    return [_compute_derived(v) for v in vessels]


@router.post("", response_model=AgingVesselOut, status_code=status.HTTP_201_CREATED)
async def create_vessel(
    payload: AgingVesselCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    # Validar código único dentro de la destilería
    existing = await db.execute(
        select(AgingVessel).where(
            AgingVessel.distillery_id == distillery.id,
            AgingVessel.code == payload.code,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un recipiente con el código '{payload.code}'",
        )

    vessel = AgingVessel(
        distillery_id=distillery.id,
        **payload.model_dump(exclude_unset=False),
    )
    db.add(vessel)
    await db.commit()
    await db.refresh(vessel)
    return _compute_derived(vessel)


@router.get("/{vessel_id}", response_model=AgingVesselOut)
async def get_vessel(
    vessel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    vessel = await _get_or_404(db, distillery.id, vessel_id)
    return _compute_derived(vessel)


@router.put("/{vessel_id}", response_model=AgingVesselOut)
async def update_vessel(
    vessel_id: int,
    payload: AgingVesselUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    vessel = await _get_or_404(db, distillery.id, vessel_id)

    updates = payload.model_dump(exclude_unset=True)
    # Si cambia el código, validar que no exista otro con el mismo
    if "code" in updates and updates["code"] != vessel.code:
        existing = await db.execute(
            select(AgingVessel).where(
                AgingVessel.distillery_id == distillery.id,
                AgingVessel.code == updates["code"],
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un recipiente con el código '{updates['code']}'",
            )

    for field, value in updates.items():
        setattr(vessel, field, value)

    await db.commit()
    await db.refresh(vessel)
    return _compute_derived(vessel)


@router.delete("/{vessel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vessel(
    vessel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    vessel = await _get_or_404(db, distillery.id, vessel_id)
    await db.delete(vessel)
    await db.commit()


@router.post("/{vessel_id}/samplings", response_model=AgingVesselOut)
async def add_sampling(
    vessel_id: int,
    sampling: SamplingEntry,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    """Añade un sampling al historial de la barrica."""
    vessel = await _get_or_404(db, distillery.id, vessel_id)
    current_samplings = list(vessel.samplings or [])
    current_samplings.append(sampling.model_dump())
    # Ordenar por fecha descendente
    current_samplings.sort(key=lambda x: x.get("date", ""), reverse=True)
    vessel.samplings = current_samplings
    await db.commit()
    await db.refresh(vessel)
    return _compute_derived(vessel)


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _get_or_404(db: AsyncSession, distillery_id: int, vessel_id: int) -> AgingVessel:
    result = await db.execute(
        select(AgingVessel).where(
            AgingVessel.id == vessel_id,
            AgingVessel.distillery_id == distillery_id,
        )
    )
    vessel = result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipiente no encontrado",
        )
    return vessel
