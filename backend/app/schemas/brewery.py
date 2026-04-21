# backend/app/schemas/brewery.py — Schemas de destilería
from datetime import datetime
from typing import Annotated, Optional
from pydantic import BaseModel, BeforeValidator, Field

from app.models.brewery import StillType, UsageType

StrID = Annotated[str, BeforeValidator(str)]


class DistilleryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    location: str | None = None
    still_type: StillType | None = None
    still_capacity_liters: float | None = None
    usage_type: UsageType = UsageType.home


class DistilleryOut(BaseModel):
    id: StrID
    name: str
    description: str | None
    location: str | None
    logo_url: str | None
    still_type: str | None
    still_capacity_liters: float | None
    usage_type: str
    space_dimensions: dict | None
    owner_id: StrID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DistilleryUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    description: str | None = None
    location: str | None = None
    still_type: StillType | None = None
    still_capacity_liters: float | None = None
    usage_type: UsageType | None = None
    space_dimensions: dict | None = None


# Aliases de retrocompatibilidad
BreweryCreate = DistilleryCreate
BreweryOut = DistilleryOut
BreweryUpdate = DistilleryUpdate
