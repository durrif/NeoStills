# backend/app/models/recipe.py
"""Modelos de receta de destilación para NeoStills v2."""
from __future__ import annotations

import enum
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class RecipeStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class DistillationMethod(str, enum.Enum):
    pot_still = "pot_still"
    column_still = "column_still"
    reflux_still = "reflux_still"
    alembic = "alembic"


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
    )
    distillery_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("distilleries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    spirit_type: Mapped[str | None] = mapped_column(String(100))    # whisky, gin, brandy, ron, vodka, aguardiente
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[RecipeStatus] = mapped_column(
        Enum(RecipeStatus, name="recipe_status_enum"),
        default=RecipeStatus.draft,
        nullable=False,
    )

    # Método de destilación
    distillation_method: Mapped[DistillationMethod | None] = mapped_column(
        Enum(DistillationMethod, name="distillation_method_enum"),
        nullable=True,
    )
    stripping_run_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Parámetros del wash (fermentado)
    wash_volume_liters: Mapped[float | None] = mapped_column(Float)        # Volumen del wash
    batch_size_liters: Mapped[float | None] = mapped_column(Float)         # Volumen objetivo de destilado
    fermentation_tank_capacity_liters: Mapped[float | None] = mapped_column(Float)
    fruit_brix: Mapped[float | None] = mapped_column(Float)                # Brix de fruta (si aplica)

    # Gravedad del wash (OG/FG para cálculo de ABV)
    og: Mapped[float | None] = mapped_column(Float)     # OG del wash
    fg: Mapped[float | None] = mapped_column(Float)     # FG del wash
    wash_abv: Mapped[float | None] = mapped_column(Float)    # ABV esperado del wash
    target_abv: Mapped[float | None] = mapped_column(Float)  # ABV objetivo del destilado final
    spirit_yield_liters: Mapped[float | None] = mapped_column(Float)       # Rendimiento estimado en litros

    # Puntos de corte configurables
    cut_points: Mapped[list[dict] | None] = mapped_column(JSON)
    # [{phase: "heads", temp_c: 78.0, abv_pct: 80.0, notes: "..."}, ...]

    # Ingredientes estructurados
    cereals: Mapped[list[dict] | None] = mapped_column(JSON)
    # [{name, amount_kg, type, gelatinization_temp_c}, …]
    botanicals: Mapped[list[dict] | None] = mapped_column(JSON)
    # [{name, amount_g, use}, …] — para gin
    fermentation_yeasts: Mapped[list[dict] | None] = mapped_column(JSON)
    # [{name, lab, attenuation_pct, temp_range}, …]
    adjuncts: Mapped[list[dict] | None] = mapped_column(JSON)
    # [{name, amount, unit, use}, …]
    mash_steps: Mapped[list[dict] | None] = mapped_column(JSON)
    # [{name, temp_c, duration_min, enzyme}, …]
    water_profile: Mapped[dict | None] = mapped_column(JSON)

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    distillery: Mapped[Any] = relationship("Distillery", back_populates="recipes")
    distillation_runs: Mapped[list["DistillationRun"]] = relationship(
        "DistillationRun", back_populates="recipe"
    )
