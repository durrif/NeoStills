# backend/app/api/v1/aging_vessels.py
"""CRUD de barricas y depósitos de envejecimiento."""
from __future__ import annotations

import json
import uuid
from datetime import date as DateType
from typing import Any, Dict, List, Optional

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


def _to_date(value: Optional[str]) -> Optional[DateType]:
    """Convierte string ISO a datetime.date; devuelve None si inválido."""
    if not value:
        return None
    try:
        return DateType.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def _from_date(value: Optional[DateType]) -> Optional[str]:
    """Convierte datetime.date a string ISO."""
    if value is None:
        return None
    return value.isoformat()


def _serialize_json(value: Any) -> Optional[str]:
    """Serializa un objeto Python a JSON string para columnas Text."""
    if value is None:
        return None
    return json.dumps(value)


def _deserialize_json(value: Optional[str], default: Any = None) -> Any:
    """Deserializa un JSON string desde columna Text."""
    if not value:
        return default
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default


def _compute_derived(vessel: AgingVessel) -> AgingVesselOut:
    """Añade campos calculados (fill_pct, age_months) y deserializa JSON antes de serializar."""
    fill_pct = 0.0
    if vessel.capacity_liters and vessel.capacity_liters > 0:
        fill_pct = round((vessel.current_volume_liters or 0) / vessel.capacity_liters * 100, 1)

    fill_date_str = _from_date(vessel.fill_date)
    target_date_str = _from_date(vessel.target_date)

    age_months: Optional[int] = None
    if vessel.fill_date:
        try:
            today = DateType.today()
            age_months = (today.year - vessel.fill_date.year) * 12 + (today.month - vessel.fill_date.month)
        except (AttributeError, TypeError):
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
        "fill_date": fill_date_str,
        "target_date": target_date_str,
        "age_months": age_months,
        "location_row": vessel.location_row,
        "location_position": vessel.location_position,
        "location_notes": vessel.location_notes,
        "samplings": _deserialize_json(vessel.samplings, default=[]),
        "aging_techniques": _deserialize_json(vessel.aging_techniques),
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
        filters.append(AgingVessel.status == status_filter.value)
    if vessel_type:
        filters.append(AgingVessel.vessel_type == vessel_type.value)
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

    data = payload.model_dump(exclude_unset=False)

    vessel = AgingVessel(
        id=str(uuid.uuid4()),
        distillery_id=distillery.id,
        code=data["code"],
        name=data.get("name"),
        notes=data.get("notes"),
        vessel_type=data.get("vessel_type", "barrel_new"),
        wood_type=data.get("wood_type", "american_white_oak"),
        toast_level=data.get("toast_level", "medium"),
        capacity_liters=data.get("capacity_liters", 200.0),
        current_volume_liters=data.get("current_volume_liters", 0.0),
        current_abv=data.get("current_abv"),
        spirit_type=data.get("spirit_type"),
        spirit_name=data.get("spirit_name"),
        source_batch_id=str(data["source_batch_id"]) if data.get("source_batch_id") else None,
        status=data.get("status", "empty"),
        fill_date=_to_date(data.get("fill_date")),
        target_date=_to_date(data.get("target_date")),
        location_row=data.get("location_row"),
        location_position=data.get("location_position"),
        location_notes=data.get("location_notes"),
        samplings=_serialize_json(data.get("samplings")),
        aging_techniques=_serialize_json(data.get("aging_techniques")),
    )
    db.add(vessel)
    await db.commit()
    await db.refresh(vessel)
    return _compute_derived(vessel)


@router.get("/{vessel_id}", response_model=AgingVesselOut)
async def get_vessel(
    vessel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    vessel = await _get_or_404(db, distillery.id, vessel_id)
    return _compute_derived(vessel)


@router.put("/{vessel_id}", response_model=AgingVesselOut)
async def update_vessel(
    vessel_id: str,
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

    # Conversiones de tipo antes de setattr
    if "fill_date" in updates:
        updates["fill_date"] = _to_date(updates["fill_date"])
    if "target_date" in updates:
        updates["target_date"] = _to_date(updates["target_date"])
    if "samplings" in updates:
        updates["samplings"] = _serialize_json(updates["samplings"])
    if "aging_techniques" in updates:
        updates["aging_techniques"] = _serialize_json(updates["aging_techniques"])

    for field, value in updates.items():
        setattr(vessel, field, value)

    await db.commit()
    await db.refresh(vessel)
    return _compute_derived(vessel)


@router.delete("/{vessel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vessel(
    vessel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    vessel = await _get_or_404(db, distillery.id, vessel_id)
    await db.delete(vessel)
    await db.commit()


@router.post("/{vessel_id}/samplings", response_model=AgingVesselOut)
async def add_sampling(
    vessel_id: str,
    sampling: SamplingEntry,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    """Añade un sampling al historial de la barrica."""
    vessel = await _get_or_404(db, distillery.id, vessel_id)
    current_samplings = _deserialize_json(vessel.samplings, default=[])
    current_samplings.append(sampling.model_dump())
    current_samplings.sort(key=lambda x: x.get("date", ""), reverse=True)
    vessel.samplings = _serialize_json(current_samplings)
    await db.commit()
    await db.refresh(vessel)
    return _compute_derived(vessel)


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _get_or_404(db: AsyncSession, distillery_id: int, vessel_id: str) -> AgingVessel:
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

