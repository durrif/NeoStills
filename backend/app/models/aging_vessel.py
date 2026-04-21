# backend/app/models/aging_vessel.py
"""Modelo de recipientes de envejecimiento/maduración."""
from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.brewery import Distillery


class VesselType(str, enum.Enum):
    # Barricas de madera
    barrel_new = "barrel_new"
    barrel_refill = "barrel_refill"
    quarter_cask = "quarter_cask"
    octave = "octave"
    hogshead = "hogshead"
    butt = "butt"
    port_pipe = "port_pipe"
    cask_ex_bourbon = "cask_ex_bourbon"
    cask_ex_sherry = "cask_ex_sherry"
    cask_ex_port = "cask_ex_port"
    cask_ex_wine = "cask_ex_wine"
    cask_ex_rum = "cask_ex_rum"
    # Depósitos de acero / micro-aging
    tank_stainless = "tank_stainless"
    tank_with_chips = "tank_with_chips"
    tank_with_spirals = "tank_with_spirals"
    tank_with_staves = "tank_with_staves"


class WoodType(str, enum.Enum):
    american_white_oak = "american_white_oak"
    european_oak = "european_oak"
    japanese_mizunara = "japanese_mizunara"
    cherry = "cherry"
    chestnut = "chestnut"
    acacia = "acacia"
    mulberry = "mulberry"
    mesquite = "mesquite"
    none = "none"  # para depósitos de acero sin madera


class ToastLevel(str, enum.Enum):
    none = "none"
    light = "light"
    medium = "medium"
    medium_plus = "medium_plus"
    heavy = "heavy"
    char_1 = "char_1"
    char_2 = "char_2"
    char_3 = "char_3"
    char_4_alligator = "char_4_alligator"


class VesselStatus(str, enum.Enum):
    empty = "empty"
    aging = "aging"
    ready_for_sampling = "ready_for_sampling"
    ready_to_bottle = "ready_to_bottle"
    bottled = "bottled"
    maintenance = "maintenance"


class AgingVessel(Base, TimestampMixin):
    """Barrica o depósito de envejecimiento de un destilado."""
    __tablename__ = "aging_vessels"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    distillery_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("distilleries.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Identificación ────────────────────────────────────────────────────────
    code: Mapped[str] = mapped_column(String(50), nullable=False)      # ej. "A-01", "B-03"
    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Tipo y madera ─────────────────────────────────────────────────────────
    vessel_type: Mapped[VesselType] = mapped_column(
        Enum(VesselType, name="vessel_type_enum"), nullable=False, default=VesselType.barrel_new
    )
    wood_type: Mapped[WoodType] = mapped_column(
        Enum(WoodType, name="wood_type_enum"), nullable=False, default=WoodType.american_white_oak
    )
    toast_level: Mapped[ToastLevel] = mapped_column(
        Enum(ToastLevel, name="toast_level_enum"), nullable=False, default=ToastLevel.medium
    )

    # ── Capacidad y llenado ───────────────────────────────────────────────────
    capacity_liters: Mapped[float] = mapped_column(Float, nullable=False, default=200.0)
    # Litros actuales del destilado
    current_volume_liters: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # Graduación alcohólica del destilado en la barrica (en %)
    current_abv: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # ── Contenido ─────────────────────────────────────────────────────────────
    # Tipo de spirit: whiskey, rum, gin, brandy, vodka, etc.
    spirit_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    spirit_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    # FK al lote de origen (opcional, puede estar null si no se usa el módulo de lotes)
    source_batch_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("distillation_runs.id", ondelete="SET NULL"), nullable=True
    )

    # ── Estado y fechas ───────────────────────────────────────────────────────
    status: Mapped[VesselStatus] = mapped_column(
        Enum(VesselStatus, name="vessel_status_enum"), nullable=False, default=VesselStatus.empty
    )
    fill_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)   # ISO date
    target_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True) # fecha objetivo de embotellado

    # ── Ubicación en la nave ──────────────────────────────────────────────────
    location_row: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)   # ej. "A"
    location_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # ej. 3
    location_notes: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # ── Histórico de samplings (JSON array) ───────────────────────────────────
    # [{date, abv, color_srm, tasting_notes, sampled_by}]
    samplings: Mapped[Optional[list[Any]]] = mapped_column(JSON, nullable=True, default=list)

    # ── Técnicas modernas de aging (JSON) ────────────────────────────────────
    # {ultrasonic: bool, pressure_cycling: bool, temp_cycling: bool, ...}
    aging_techniques: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # ─── Relationships ────────────────────────────────────────────────────────
    distillery: Mapped["Distillery"] = relationship("Distillery", back_populates="aging_vessels")
