# backend/app/api/v1/recipes.py
"""Recipe CRUD + BeerXML import + Brewer's Friend sync."""
from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from typing import Any

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_distillery, get_db
from app.core.config import settings
from app.models.brewery import Distillery
from app.models.recipe import Recipe, RecipeStatus
from app.schemas.recipe import (
    CanBrewItem,
    CanBrewLowStock,
    CanBrewResult,
    RecipeCreate,
    RecipeOut,
    RecipeUpdate,
)
from app.utils.beerxml import parse_beerxml

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recipes", tags=["Recipes"])


# ---------------------------------------------------------------------------
# Helpers (BeerXML parsing moved to app.utils.beerxml)
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[RecipeOut])
async def list_recipes(
    status_filter: RecipeStatus | None = Query(None, alias="status"),
    search: str | None = Query(None, max_length=100),
    skip: int = 0,
    limit: int = Query(50, le=200),
    current_user=Depends(get_current_user),
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
):
    q = select(Recipe).where(Recipe.distillery_id == distillery.id)
    if status_filter:
        q = q.where(Recipe.status == status_filter)
    if search:
        q = q.where(Recipe.name.ilike(f"%{search}%"))
    q = q.order_by(Recipe.updated_at.desc()).offset(skip).limit(limit)

    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    data: RecipeCreate,
    current_user=Depends(get_current_user),
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
):
    recipe = Recipe(distillery_id=distillery.id, **data.model_dump())
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.get("/{recipe_id}", response_model=RecipeOut)
async def get_recipe(
    recipe_id: int,
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
):
    recipe = await db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.distillery_id == distillery.id,
        )
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.patch("/{recipe_id}", response_model=RecipeOut)
async def update_recipe(
    recipe_id: int,
    data: RecipeUpdate,
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
):
    recipe = await db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.distillery_id == distillery.id,
        )
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(recipe, field, value)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(
    recipe_id: int,
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
):
    recipe = await db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.distillery_id == distillery.id,
        )
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    await db.delete(recipe)
    await db.commit()


@router.post("/import/beerxml", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
async def import_beerxml(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
):
    """Import a BeerXML 1.0 file and create a new recipe."""
    # Validate file type
    ALLOWED_EXTENSIONS = (".xml", ".beerxml")
    ALLOWED_MIMES = ("text/xml", "application/xml", "application/octet-stream")
    filename = file.filename or ""
    if not any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Only .xml or .beerxml files accepted")
    if file.content_type and file.content_type not in ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail=f"Invalid content type: {file.content_type}")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5 MB limit
        raise HTTPException(status_code=413, detail="File too large (max 5 MB)")

    try:
        recipes = parse_beerxml(content)
        if not recipes:
            raise HTTPException(status_code=422, detail="No recipes found in BeerXML file")
        recipe_data = recipes[0]  # Import first recipe
    except (ET.ParseError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid BeerXML: {exc}") from exc

    recipe = Recipe(distillery_id=distillery.id, **recipe_data)
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.post("/import/brewers-friend/{bf_recipe_id}", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
async def import_brewers_friend(
    bf_recipe_id: str,
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a recipe from Brewer's Friend API and import it."""
    if not settings.BREWERS_FRIEND_API_KEY:
        raise HTTPException(status_code=503, detail="Brewer's Friend API key not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://www.brewersfriend.com/home distilling/recipe/view/{bf_recipe_id}/format/json",
            headers={"API-KEY": settings.BREWERS_FRIEND_API_KEY},
        )

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Recipe not found on Brewer's Friend")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Brewer's Friend API error")

    raw: dict = resp.json()
    name = raw.get("name", "BF Import")
    recipe = Recipe(
        distillery_id=distillery.id,
        name=name,
        og=raw.get("og"),
        fg=raw.get("fg"),
        batch_size_liters=raw.get("batch_size"),
        spirit_type=raw.get("spirit_type") or raw.get("style_name"),
        wash_abv=raw.get("abv"),
        cereals=raw.get("fermentables", []),
        botanicals=raw.get("hops", []),
        fermentation_yeasts=raw.get("yeasts", []),
        notes=f"Brewer's Friend import {bf_recipe_id}",
    )
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


# ---------------------------------------------------------------------------
# Can-brew check + brew session creation
# ---------------------------------------------------------------------------



@router.get("/{recipe_id}/can-brew", response_model=CanBrewResult)
async def check_can_brew(
    recipe_id: int,
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
):
    """Check if we have enough inventory to brew this recipe."""
    from app.models.ingredient import Ingredient

    recipe = await db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.distillery_id == distillery.id,
        )
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Gather all ingredients from the recipe
    needed: list[dict[str, Any]] = []
    for cereal in (recipe.cereals or []):
        needed.append({"name": cereal.get("name", ""), "amount": cereal.get("amount_kg", 0), "unit": "kg"})
    for botanical in (recipe.botanicals or []):
        needed.append({"name": botanical.get("name", ""), "amount": (botanical.get("amount_g", 0) or 0) / 1000, "unit": "kg"})
    for yeast in (recipe.fermentation_yeasts or []):
        needed.append({
            "name": yeast.get("name", ""),
            "amount": yeast.get("amount_units") or yeast.get("amount") or 1,
            "unit": yeast.get("unit", "pkt"),
        })
    for adjunct in (recipe.adjuncts or []):
        needed.append({
            "name": adjunct.get("name", ""),
            "amount": adjunct.get("amount", 0),
            "unit": adjunct.get("unit", "kg"),
        })

    # Get inventory
    inv_result = await db.execute(
        select(Ingredient).where(Ingredient.distillery_id == distillery.id)
    )
    inventory = {ing.name.lower(): ing for ing in inv_result.scalars().all()}

    missing = []
    low_stock = []
    available = []

    for item in needed:
        name = item["name"]
        if not name:
            continue
        inv_item = inventory.get(name.lower())
        if not inv_item:
            missing.append(CanBrewItem(name=name, required=item["amount"], unit=item["unit"]))
        elif inv_item.quantity < item["amount"]:
            low_stock.append(CanBrewLowStock(
                name=name, required=item["amount"], available=inv_item.quantity, unit=item["unit"]
            ))
        else:
            available.append(name)

    if missing:
        result_status = "missing"
    elif low_stock:
        result_status = "partial"
    else:
        result_status = "ready"

    return CanBrewResult(status=result_status, missing=missing, low_stock=low_stock, available=available)


@router.post("/{recipe_id}/brew", status_code=status.HTTP_201_CREATED)
async def start_brew_from_recipe(
    recipe_id: int,
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
):
    """Create a new brew session from a recipe."""
    from app.models.brew_session import DistillationRun, SessionPhase

    recipe = await db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.distillery_id == distillery.id,
        )
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    session_obj = DistillationRun(
        distillery_id=distillery.id,
        recipe_id=recipe.id,
        name=recipe.name,
        phase=SessionPhase.planned,
        still_type=recipe.distillation_method.value if recipe.distillation_method else None,
        wash_volume_liters=recipe.wash_volume_liters,
        planned_og=recipe.og,
        planned_fg=recipe.fg,
        wash_abv=recipe.wash_abv,
        target_abv=recipe.target_abv,
        stripping_run_enabled=recipe.stripping_run_enabled,
    )
    db.add(session_obj)
    await db.commit()
    await db.refresh(session_obj)
    return {"session_id": session_obj.id}
