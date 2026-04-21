# tests/test_schemas.py
"""Unit tests for Pydantic schemas — validation rules, coercion, edge cases."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest, LoginRequest
from app.schemas.ingredient import IngredientCreate, StockAdjust
from app.schemas.recipe import RecipeCreate, RecipeUpdate, CanBrewResult, CanBrewItem
from app.schemas.brewing import SessionCreate, SessionUpdate, PhaseAdvance
from app.schemas.fermentation import DataPointIn, ISpindelPayload
from app.schemas.price import PriceResultOut
from app.schemas.water import WaterProfileIn, AdjustmentRequest
from app.schemas.brewery import BreweryCreate


# -- Auth schemas ---

class TestRegisterRequest:
    def test_valid(self):
        req = RegisterRequest(
            email="test@neostills.es",
            password="Strong1234!",
            full_name="John Doe",
            brewery_name="NeoStills Lab",
        )
        assert req.email == "test@neostills.es"
        assert req.brewery_name == "NeoStills Lab"

    def test_weak_password_no_uppercase(self):
        with pytest.raises(ValidationError, match="uppercase"):
            RegisterRequest(email="a@b.com", password="weak1234!", full_name="X Y")

    def test_weak_password_no_digit(self):
        with pytest.raises(ValidationError, match="digit"):
            RegisterRequest(email="a@b.com", password="Weakweak!", full_name="X Y")

    def test_weak_password_no_special(self):
        with pytest.raises(ValidationError, match="special"):
            RegisterRequest(email="a@b.com", password="Weak1234x", full_name="X Y")

    def test_short_password(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="a@b.com", password="A1!", full_name="X Y")

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="not-an-email", password="Strong1234!", full_name="X Y")


class TestLoginRequest:
    def test_valid(self):
        req = LoginRequest(email="a@b.com", password="whatever")
        assert req.password == "whatever"


# -- Ingredient schemas ---

class TestIngredientCreate:
    def test_valid(self):
        ic = IngredientCreate(name="Pilsner Malt", category="malta_base", quantity=25.0)
        assert ic.quantity == 25.0

    def test_negative_quantity_rejected(self):
        with pytest.raises(ValidationError):
            IngredientCreate(name="Hops", category="lupulo", quantity=-1)


class TestStockAdjust:
    def test_positive_delta(self):
        sa = StockAdjust(delta=5.0, reason="Delivery")
        assert sa.delta == 5.0

    def test_negative_delta(self):
        sa = StockAdjust(delta=-2.5, reason="Used in brew")
        assert sa.delta == -2.5


# -- Recipe schemas ---

class TestRecipeCreate:
    def test_minimal(self):
        rc = RecipeCreate(name="IPA")
        assert rc.name == "IPA"
        assert rc.fermentables is None

    def test_full(self):
        rc = RecipeCreate(
            name="West Coast IPA",
            style="American IPA",
            style_code="21A",
            batch_size_liters=20.0,
            og=1.065,
            fg=1.012,
            abv=6.9,
            ibu=65,
            fermentables=[{"name": "Pale Ale Malt", "amount_kg": 5.0}],
            hops=[{"name": "Centennial", "amount_g": 50, "alpha_pct": 10.0}],
        )
        assert rc.abv == 6.9

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            RecipeCreate(name="")


class TestRecipeUpdate:
    def test_partial_update(self):
        ru = RecipeUpdate(status="published")
        assert ru.status.value == "published"
        assert ru.name is None


class TestCanBrewResult:
    def test_ready(self):
        r = CanBrewResult(status="ready", missing=[], low_stock=[], available=["Malt"])
        assert r.status == "ready"

    def test_missing(self):
        r = CanBrewResult(
            status="missing",
            missing=[CanBrewItem(name="Citra", required=0.1, unit="kg")],
            low_stock=[],
            available=[],
        )
        assert len(r.missing) == 1


# -- Brewing schemas ---

class TestSessionCreate:
    def test_minimal(self):
        sc = SessionCreate(name="Batch #42")
        assert sc.recipe_id is None

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            SessionCreate(name="")


class TestPhaseAdvance:
    def test_valid_phase(self):
        pa = PhaseAdvance(phase="mashing", notes="Starting mash")
        assert pa.phase.value == "mashing"


# -- Fermentation schemas ---

class TestDataPointIn:
    def test_defaults(self):
        dp = DataPointIn()
        assert dp.source == "manual"
        assert dp.temperature is None


class TestISpindelPayload:
    def test_valid(self):
        payload = ISpindelPayload(
            name="iSpindel001",
            ID=12345,
            angle=45.2,
            temperature=20.5,
            battery=3.8,
            gravity=1.048,
            interval=900,
            RSSI=-65,
        )
        assert payload.gravity == 1.048


# -- Price schemas ---

class TestPriceResultOut:
    def test_valid(self):
        p = PriceResultOut(
            ingredient_name="Pilsner",
            shop_name="CerveShop",
            shop_url="https://example.com",
            product_url="https://example.com/p/1",
            product_name="Pilsner Malt 25kg",
            price=32.50,
            unit="kg",
            price_per_kg=1.30,
            in_stock=True,
        )
        assert p.cached is False


# -- Water schemas ---

class TestWaterProfileIn:
    def test_defaults(self):
        wp = WaterProfileIn()
        assert wp.calcium == 0
        assert wp.ph == 7.0

    def test_out_of_range(self):
        with pytest.raises(ValidationError):
            WaterProfileIn(calcium=2000)

    def test_ph_bounds(self):
        with pytest.raises(ValidationError):
            WaterProfileIn(ph=15.0)


class TestAdjustmentRequest:
    def test_valid(self):
        ar = AdjustmentRequest(
            profile=WaterProfileIn(calcium=50, sulfate=80),
            style="IPA",
            batch_liters=20,
        )
        assert ar.style == "IPA"

    def test_zero_liters_rejected(self):
        with pytest.raises(ValidationError):
            AdjustmentRequest(
                profile=WaterProfileIn(),
                batch_liters=0,
            )


# -- Brewery schemas ---

class TestBreweryCreate:
    def test_valid(self):
        bc = BreweryCreate(name="Mi Cerveceria")
        assert bc.description is None

    def test_short_name_rejected(self):
        with pytest.raises(ValidationError):
            BreweryCreate(name="X")
