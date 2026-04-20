# backend/app/models/purchase.py
from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import enum
from sqlalchemy import Enum as SAEnum


class PurchaseStatus(str, enum.Enum):
    pending = "pending"
    processed = "processed"
    failed = "failed"


class Purchase(Base, TimestampMixin):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    distillery_id = Column(Integer, ForeignKey("distilleries.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier = Column(String(255), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    invoice_url = Column(String(1024), nullable=True)
    total_amount = Column(Float, nullable=True)
    currency = Column(String(3), default="EUR")
    status = Column(SAEnum(PurchaseStatus), default=PurchaseStatus.pending, nullable=False)
    notes = Column(Text, nullable=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True)

    distillery = relationship("Distillery", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base, TimestampMixin):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id", ondelete="SET NULL"), nullable=True, index=True)
    ingredient_name = Column(String(255), nullable=False)  # denormalized for invoice history
    quantity = Column(Float, nullable=False)
    unit = Column(String(10), nullable=False)
    unit_price = Column(Float, nullable=True)
    total_price = Column(Float, nullable=True)

    purchase = relationship("Purchase", back_populates="items")
    ingredient = relationship("Ingredient", back_populates="purchase_items")
