# backend/app/api/v1/inventory.py
from typing import Generic, List, Optional, TypeVar
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_distillery
from app.core.database import get_db
from app.models.ingredient import Ingredient, IngredientCategory
from app.models.user import User
from app.models.brewery import Distillery
from app.schemas.ingredient import IngredientCreate, IngredientUpdate, IngredientOut, StockAdjust

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    has_more: bool

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=PaginatedResponse[IngredientOut])
async def list_ingredients(
    category: Optional[IngredientCategory] = None,
    search: Optional[str] = Query(None, max_length=100),
    low_stock_only: bool = False,
    expiring_days: Optional[int] = Query(None, ge=1, le=365),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    filters = [Ingredient.distillery_id == distillery.id]

    if category:
        filters.append(Ingredient.category == category)

    if search:
        filters.append(Ingredient.name.ilike(f"%{search}%"))

    if low_stock_only:
        filters.append(
            and_(Ingredient.min_stock.is_not(None), Ingredient.quantity <= Ingredient.min_stock)
        )

    if expiring_days:
        cutoff = date.today() + timedelta(days=expiring_days)
        filters.append(
            and_(Ingredient.expiry_date.is_not(None), Ingredient.expiry_date <= cutoff)
        )

    total = await db.scalar(
        select(func.count()).select_from(Ingredient).where(and_(*filters))
    )

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Ingredient)
        .where(and_(*filters))
        .order_by(Ingredient.name)
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()
    return PaginatedResponse(
        items=items,
        total=total or 0,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < (total or 0),
    )


@router.post("", response_model=IngredientOut, status_code=status.HTTP_201_CREATED)
async def create_ingredient(
    data: IngredientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    ingredient = Ingredient(
        distillery_id=distillery.id,
        **data.model_dump(),
    )
    db.add(ingredient)
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.get("/alerts/expiring", response_model=List[IngredientOut])
async def get_expiring_ingredients(
    days: int = Query(60, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    """Return ingredients expiring within `days` days."""
    cutoff = date.today() + timedelta(days=days)
    result = await db.execute(
        select(Ingredient).where(
            Ingredient.distillery_id == distillery.id,
            Ingredient.expiry_date.is_not(None),
            Ingredient.expiry_date <= cutoff,
        ).order_by(Ingredient.expiry_date)
    )
    return result.scalars().all()


@router.get("/alerts/low-stock", response_model=List[IngredientOut])
async def get_low_stock_ingredients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    """Return ingredients at or below min_stock threshold."""
    result = await db.execute(
        select(Ingredient).where(
            Ingredient.distillery_id == distillery.id,
            Ingredient.min_stock.is_not(None),
            Ingredient.quantity <= Ingredient.min_stock,
        ).order_by(Ingredient.quantity)
    )
    return result.scalars().all()


@router.get("/{ingredient_id}", response_model=IngredientOut)
async def get_ingredient(
    ingredient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    result = await db.execute(
        select(Ingredient).where(
            Ingredient.id == ingredient_id,
            Ingredient.distillery_id == distillery.id,
        )
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")
    return ingredient


@router.patch("/{ingredient_id}", response_model=IngredientOut)
async def update_ingredient(
    ingredient_id: str,
    data: IngredientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    result = await db.execute(
        select(Ingredient).where(
            Ingredient.id == ingredient_id,
            Ingredient.distillery_id == distillery.id,
        )
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ingredient, field, value)

    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.post("/{ingredient_id}/adjust", response_model=IngredientOut)
async def adjust_stock(
    ingredient_id: str,
    data: StockAdjust,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    result = await db.execute(
        select(Ingredient).where(
            Ingredient.id == ingredient_id,
            Ingredient.distillery_id == distillery.id,
        )
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")

    new_qty = ingredient.quantity + data.delta
    if new_qty < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock cannot go below zero")

    ingredient.quantity = new_qty
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.delete("/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingredient(
    ingredient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    distillery: Distillery = Depends(get_current_distillery),
):
    result = await db.execute(
        select(Ingredient).where(
            Ingredient.id == ingredient_id,
            Ingredient.distillery_id == distillery.id,
        )
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")

    await db.delete(ingredient)
    await db.commit()
