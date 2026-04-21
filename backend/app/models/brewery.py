# backend/app/models/brewery.py
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, Enum, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class StillType(str, enum.Enum):
    pot_still = "pot_still"
    column_still = "column_still"
    reflux_still = "reflux_still"
    alembic = "alembic"
    other = "other"


class UsageType(str, enum.Enum):
    home = "home"
    professional = "professional"


class Distillery(Base, TimestampMixin):
    """
    Una destilería por usuario (rol destilador).
    Todo el inventario, recetas y lotes están en scope de distillery_id FK.
    """
    __tablename__ = "distilleries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Datos del alambique
    still_type: Mapped[Optional[StillType]] = mapped_column(
        Enum(StillType, name="still_type_enum"), nullable=True
    )
    still_capacity_liters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    usage_type: Mapped[UsageType] = mapped_column(
        Enum(UsageType, name="usage_type_enum"),
        default=UsageType.home,
        nullable=False,
    )

    # Dimensiones del espacio (Digital Twin)
    space_dimensions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    water_profile_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="neutral")
    starter_pack: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="none")

    # Owner FK
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    owner: Mapped["User"] = relationship("User", back_populates="distillery")
    ingredients = relationship("Ingredient", back_populates="distillery", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="distillery", cascade="all, delete-orphan")
    conversations = relationship("AIConversation", back_populates="distillery", cascade="all, delete-orphan")
    recipes = relationship("Recipe", back_populates="distillery", cascade="all, delete-orphan")
    distillation_runs = relationship("DistillationRun", back_populates="distillery", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_distilleries_owner_id", "owner_id"),
    )

    def __repr__(self) -> str:
        return f"<Distillery id={self.id} name={self.name}>"


# Alias de retrocompatibilidad
Brewery = Distillery
