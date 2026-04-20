# backend/app/api/v1/purchases.py
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, get_current_distillery
from app.core.database import get_db
from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus
from app.models.ingredient import Ingredient
from app.models.user import User
from app.models.brewery import Distillery
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate, PurchaseOut

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.get("", response_model=List[PurchaseOut])
async def list_purchases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .where(Purchase.distillery_id == distillery.id)
        .order_by(Purchase.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
async def create_purchase(
    data: PurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    purchase = Purchase(
        id=uuid.uuid4().hex,
        brewery_id=distillery.id,
        supplier=data.supplier,
        invoice_number=data.invoice_number,
        total_amount=data.total_amount,
        currency=data.currency,
        notes=data.notes,
        purchase_date=data.purchase_date,
        status=PurchaseStatus.processed,
    )
    db.add(purchase)

    for item_data in data.items:
        item = PurchaseItem(
            id=uuid.uuid4().hex,
            purchase_id=purchase.id,
            **item_data.model_dump(),
        )
        db.add(item)

        # Auto-update ingredient stock if ingredient_id provided
        if item_data.ingredient_id:
            ing_result = await db.execute(
                select(Ingredient).where(
                    Ingredient.id == item_data.ingredient_id,
                    Ingredient.distillery_id == distillery.id,
                )
            )
            ingredient = ing_result.scalar_one_or_none()
            if ingredient:
                ingredient.quantity += item_data.quantity

    await db.commit()
    result = await db.execute(
        select(Purchase).options(selectinload(Purchase.items)).where(Purchase.id == purchase.id)
    )
    return result.scalar_one()


@router.get("/{purchase_id}", response_model=PurchaseOut)
async def get_purchase(
    purchase_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .where(Purchase.id == purchase_id, Purchase.distillery_id == distillery.id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    return purchase


@router.patch("/{purchase_id}", response_model=PurchaseOut)
async def update_purchase(
    purchase_id: str,
    data: PurchaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .where(Purchase.id == purchase_id, Purchase.distillery_id == distillery.id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(purchase, field, value)

    await db.commit()
    await db.refresh(purchase)
    return purchase


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_purchase(
    purchase_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    result = await db.execute(
        select(Purchase).where(Purchase.id == purchase_id, Purchase.distillery_id == distillery.id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    await db.delete(purchase)
    await db.commit()


@router.post("/upload-invoice", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
async def upload_invoice(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    """Upload a PDF invoice and parse it with pdfplumber + regex."""
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    content = await file.read()

    # Parse invoice asynchronously using the service
    from app.services.invoice_parser import parse_invoice_pdf
    parsed = await parse_invoice_pdf(content, filename=file.filename or "invoice.pdf")

    purchase = Purchase(
        id=uuid.uuid4().hex,
        brewery_id=distillery.id,
        supplier=parsed.get("supplier"),
        invoice_number=parsed.get("invoice_number"),
        total_amount=parsed.get("total_amount"),
        currency=parsed.get("currency", "EUR"),
        status=PurchaseStatus.processed,
    )
    db.add(purchase)

    for item_data in parsed.get("items", []):
        item = PurchaseItem(
            id=uuid.uuid4().hex,
            purchase_id=purchase.id,
            ingredient_name=item_data.get("name", "Unknown"),
            quantity=item_data.get("quantity", 0),
            unit=item_data.get("unit", "kg"),
            unit_price=item_data.get("unit_price"),
            total_price=item_data.get("total_price"),
        )
        db.add(item)

    await db.commit()
    result = await db.execute(
        select(Purchase).options(selectinload(Purchase.items)).where(Purchase.id == purchase.id)
    )
    return result.scalar_one()
