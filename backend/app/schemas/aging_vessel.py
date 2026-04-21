# backend/app/schemas/aging_vessel.py
from datetime import datetime
from typing import Annotated, Any, Optional
from pydantic import BaseModel, BeforeValidator, Field

from app.models.aging_vessel import VesselType, WoodType, ToastLevel, VesselStatus

StrID = Annotated[str, BeforeValidator(str)]


class AgingVesselCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None

    vessel_type: VesselType = VesselType.barrel_new
    wood_type: WoodType = WoodType.american_white_oak
    toast_level: ToastLevel = ToastLevel.medium

    capacity_liters: float = Field(200.0, gt=0)
    current_volume_liters: float = Field(0.0, ge=0)
    current_abv: Optional[float] = Field(None, ge=0, le=100)

    spirit_type: Optional[str] = Field(None, max_length=100)
    spirit_name: Optional[str] = Field(None, max_length=200)
    source_batch_id: Optional[int] = None

    status: VesselStatus = VesselStatus.empty
    fill_date: Optional[str] = None
    target_date: Optional[str] = None

    location_row: Optional[str] = Field(None, max_length=10)
    location_position: Optional[int] = None
    location_notes: Optional[str] = Field(None, max_length=200)

    samplings: Optional[list[Any]] = None
    aging_techniques: Optional[dict[str, Any]] = None


class AgingVesselUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None

    vessel_type: Optional[VesselType] = None
    wood_type: Optional[WoodType] = None
    toast_level: Optional[ToastLevel] = None

    capacity_liters: Optional[float] = Field(None, gt=0)
    current_volume_liters: Optional[float] = Field(None, ge=0)
    current_abv: Optional[float] = Field(None, ge=0, le=100)

    spirit_type: Optional[str] = Field(None, max_length=100)
    spirit_name: Optional[str] = Field(None, max_length=200)
    source_batch_id: Optional[int] = None

    status: Optional[VesselStatus] = None
    fill_date: Optional[str] = None
    target_date: Optional[str] = None

    location_row: Optional[str] = Field(None, max_length=10)
    location_position: Optional[int] = None
    location_notes: Optional[str] = Field(None, max_length=200)

    samplings: Optional[list[Any]] = None
    aging_techniques: Optional[dict[str, Any]] = None


class SamplingEntry(BaseModel):
    """Un sampling (muestra) de una barrica en una fecha concreta."""
    date: str  # ISO date
    abv: Optional[float] = Field(None, ge=0, le=100)
    color_srm: Optional[float] = Field(None, ge=0)
    tasting_notes: Optional[str] = None
    sampled_by: Optional[str] = None


class AgingVesselOut(BaseModel):
    id: StrID
    distillery_id: StrID
    code: str
    name: Optional[str]
    notes: Optional[str]

    vessel_type: VesselType
    wood_type: WoodType
    toast_level: ToastLevel

    capacity_liters: float
    current_volume_liters: float
    current_abv: Optional[float]
    fill_pct: float  # calculado: current_volume_liters / capacity_liters * 100

    spirit_type: Optional[str]
    spirit_name: Optional[str]
    source_batch_id: Optional[StrID]

    status: VesselStatus
    fill_date: Optional[str]
    target_date: Optional[str]
    # Edad en meses calculada desde fill_date si existe
    age_months: Optional[int]

    location_row: Optional[str]
    location_position: Optional[int]
    location_notes: Optional[str]

    samplings: Optional[list[Any]]
    aging_techniques: Optional[dict[str, Any]]

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
