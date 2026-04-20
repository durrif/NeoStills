# backend/app/api/v1/voice.py
"""
Voice command processing endpoint.
Accepts transcribed text from the frontend (Web Speech API) or the voice
gateway and returns a structured action + natural-language response.
"""
from __future__ import annotations

import logging
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_distillery, get_db
from app.models.ingredient import Ingredient, IngredientCategory
from app.models.brewery import Distillery

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class VoiceCommandRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2048)
    context_page: str | None = Field(None, max_length=64)
    language: str = Field("es", pattern="^(es|en)$")


class VoiceAction(BaseModel):
    type: str        # navigate, search, adjust_stock, start_timer, set_temp, …
    params: dict     # action-specific parameters


class VoiceCommandResponse(BaseModel):
    action: VoiceAction | None
    reply: str        # text to speak back (TTS)
    confidence: float = 1.0


# ---------------------------------------------------------------------------
# Simple intent patterns (extendable via LLM in a later iteration)
# ---------------------------------------------------------------------------

_INTENTS_ES = [
    (re.compile(r"ir\s+a\s+(inventario|recetas|elaboraci[oó]n|fermentaci[oó]n|tienda|ajustes)", re.I), "navigate"),
    (re.compile(r"busca[r]?\s+(.+)", re.I), "search"),
    (re.compile(r"a[ñn]ade?[r]?\s+(\d+[\.,]?\d*)\s*(kg|g|l|ml|sobre|unidades?)\s+(?:de\s+)?(.+)", re.I), "adjust_stock"),
    (re.compile(r"inicia[r]?\s+temporizador\s+(?:de\s+)?(\d+)\s*(minutos?|horas?)", re.I), "start_timer"),
    (re.compile(r"temperatura\s+(?:a\s+)?(\d+[\.,]?\d*)\s*(?:grados?|°?C?)", re.I), "set_temperature"),
    (re.compile(r"(empezar|iniciar|nueva)\s+(coc[cz]i[oó]n|elaboraci[oó]n|bielab)", re.I), "start_brew"),
    # Inventory queries — handled async with DB
    (re.compile(r"cu[aá]nt[oa]\s+(.+?)\s+(?:tengo|hay|queda)", re.I), "query_stock"),
    (re.compile(r"(?:tengo|hay|queda)\s+(.+?)\s+en\s+(?:el\s+)?inventario", re.I), "query_stock"),
    (re.compile(r"(?:qu[eé]\s+)?(?:tengo|hay)\s+en\s+(?:el\s+)?inventario", re.I), "list_inventory"),
    (re.compile(r"(?:listar?|mostrar?|ver)\s+(?:el\s+)?inventario", re.I), "list_inventory"),
    (re.compile(r"(?:ingredientes?\s+)?(?:con\s+)?(?:stock\s+)?bajo[s]?", re.I), "low_stock"),
]

_NAV_MAP_ES = {
    "inventario": "inventory",
    "recetas": "recipes",
    "elaboración": "brewing",
    "elaboracion": "brewing",
    "fermentación": "fermentation",
    "fermentacion": "fermentation",
    "tienda": "shop",
    "ajustes": "settings",
}

_REPLIES_ES: dict[str, str] = {
    "navigate": "Navegando a {target}",
    "search": 'Buscando "{query}"',
    "adjust_stock": "Añadiendo {amount} {unit} de {ingredient}",
    "start_timer": "Iniciando temporizador de {duration} {unit}",
    "set_temperature": "Estableciendo temperatura a {temp}°C",
    "start_brew": "Iniciando nueva elaboración",
    "unknown": "No entendí el comando. ¿Puedes repetirlo?",
}


def parse_command(text: str, lang: str) -> tuple[VoiceCommandResponse | None, str | None]:
    """Parse text for intent. Returns (response, async_intent) where async_intent
    signals the caller to do a DB query."""
    patterns = _INTENTS_ES

    for pattern, intent in patterns:
        m = pattern.search(text)
        if not m:
            continue

        if intent == "navigate":
            raw = m.group(1).lower()
            page = _NAV_MAP_ES.get(raw, raw)
            return VoiceCommandResponse(
                action=VoiceAction(type="navigate", params={"page": page}),
                reply=_REPLIES_ES["navigate"].format(target=raw),
            ), None

        if intent == "search":
            query = m.group(1).strip()
            return VoiceCommandResponse(
                action=VoiceAction(type="search", params={"query": query}),
                reply=_REPLIES_ES["search"].format(query=query),
            ), None

        if intent == "adjust_stock":
            amount = float(m.group(1).replace(",", "."))
            unit = m.group(2).lower().rstrip("s")
            ingredient = m.group(3).strip()
            return VoiceCommandResponse(
                action=VoiceAction(
                    type="adjust_stock",
                    params={"amount": amount, "unit": unit, "ingredient": ingredient},
                ),
                reply=_REPLIES_ES["adjust_stock"].format(
                    amount=amount, unit=unit, ingredient=ingredient
                ),
            ), None

        if intent == "start_timer":
            duration = int(m.group(1))
            unit = m.group(2).lower().rstrip("s")
            minutes = duration * 60 if "hora" in unit else duration
            return VoiceCommandResponse(
                action=VoiceAction(
                    type="start_timer", params={"minutes": minutes}
                ),
                reply=_REPLIES_ES["start_timer"].format(duration=duration, unit=unit),
            ), None

        if intent == "set_temperature":
            temp = float(m.group(1).replace(",", "."))
            return VoiceCommandResponse(
                action=VoiceAction(type="set_temperature", params={"celsius": temp}),
                reply=_REPLIES_ES["set_temperature"].format(temp=temp),
            ), None

        if intent == "start_brew":
            return VoiceCommandResponse(
                action=VoiceAction(type="start_brew", params={}),
                reply=_REPLIES_ES["start_brew"],
            ), None

        # DB-backed intents — return the match for async processing
        if intent in ("query_stock", "list_inventory", "low_stock"):
            search_term = m.group(1).strip() if intent == "query_stock" else None
            return None, intent + (":" + search_term if search_term else "")

    return VoiceCommandResponse(
        action=None,
        reply=_REPLIES_ES["unknown"],
        confidence=0.0,
    ), None


async def _handle_inventory_query(
    intent_key: str, db: AsyncSession, distillery: Distillery
) -> VoiceCommandResponse:
    """Handle inventory intents that require DB access."""
    brewery_id = distillery.id

    if intent_key.startswith("query_stock:"):
        search = intent_key.split(":", 1)[1].lower()
        # Clean common filler words from search
        for filler in ["de ", "el ", "la ", "los ", "las ", "un ", "una "]:
            search = search.replace(filler, "")
        search = search.strip()

        result = await db.execute(
            select(Ingredient)
            .where(Ingredient.distillery_id == brewery_id)
            .where(Ingredient.name.ilike(f"%{search}%"))
        )
        ingredients = result.scalars().all()

        if not ingredients:
            return VoiceCommandResponse(
                action=VoiceAction(type="query_stock", params={"search": search}),
                reply=f"No he encontrado ningún ingrediente que coincida con {search}.",
                confidence=0.8,
            )

        if len(ingredients) == 1:
            ing = ingredients[0]
            return VoiceCommandResponse(
                action=VoiceAction(type="query_stock", params={"ingredient_id": ing.id}),
                reply=f"Tienes {ing.quantity} {ing.unit.value if hasattr(ing.unit, 'value') else ing.unit} de {ing.name}.",
                confidence=1.0,
            )

        # Multiple matches
        items = [f"{i.name}: {i.quantity} {i.unit.value if hasattr(i.unit, 'value') else i.unit}" for i in ingredients[:5]]
        reply = f"He encontrado {len(ingredients)} ingredientes: " + ", ".join(items)
        if len(ingredients) > 5:
            reply += f" y {len(ingredients) - 5} más."
        return VoiceCommandResponse(
            action=VoiceAction(type="query_stock", params={"search": search, "count": len(ingredients)}),
            reply=reply,
            confidence=0.9,
        )

    if intent_key == "list_inventory":
        result = await db.execute(
            select(func.count()).select_from(Ingredient).where(Ingredient.distillery_id == brewery_id)
        )
        total = result.scalar() or 0

        result = await db.execute(
            select(Ingredient)
            .where(Ingredient.distillery_id == brewery_id)
            .order_by(Ingredient.category, Ingredient.name)
            .limit(10)
        )
        ingredients = result.scalars().all()

        if total == 0:
            return VoiceCommandResponse(
                action=VoiceAction(type="navigate", params={"page": "inventory"}),
                reply="Tu inventario está vacío.",
            )

        items = [f"{i.name} ({i.quantity} {i.unit.value if hasattr(i.unit, 'value') else i.unit})" for i in ingredients]
        reply = f"Tienes {total} ingredientes en inventario. Los primeros son: " + ", ".join(items)
        if total > 10:
            reply += "."
        return VoiceCommandResponse(
            action=VoiceAction(type="navigate", params={"page": "inventory"}),
            reply=reply,
        )

    if intent_key == "low_stock":
        result = await db.execute(
            select(Ingredient)
            .where(Ingredient.distillery_id == brewery_id)
            .where(Ingredient.min_stock.isnot(None))
            .where(Ingredient.quantity <= Ingredient.min_stock)
        )
        low = result.scalars().all()

        if not low:
            return VoiceCommandResponse(
                action=VoiceAction(type="low_stock", params={"count": 0}),
                reply="No tienes ingredientes con stock bajo. ¡Todo bien!",
            )

        items = [f"{i.name} ({i.quantity} {i.unit.value if hasattr(i.unit, 'value') else i.unit})" for i in low[:5]]
        reply = f"Tienes {len(low)} ingredientes con stock bajo: " + ", ".join(items)
        return VoiceCommandResponse(
            action=VoiceAction(type="low_stock", params={"count": len(low)}),
            reply=reply,
        )

    return VoiceCommandResponse(action=None, reply=_REPLIES_ES["unknown"], confidence=0.0)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/command", response_model=VoiceCommandResponse)
async def process_voice_command(
    req: VoiceCommandRequest,
    current_user=Depends(get_current_user),
    distillery: Distillery = Depends(get_current_distillery),
    db: AsyncSession = Depends(get_db),
) -> VoiceCommandResponse:
    """
    Parse a voice command transcription and return a structured action.
    Supports inventory queries with real database lookups.
    """
    response, async_intent = parse_command(req.text, req.language)

    if async_intent:
        return await _handle_inventory_query(async_intent, db, brewery)

    return response


@router.get("/capabilities")
async def get_voice_capabilities(
    current_user=Depends(get_current_user),
) -> dict:
    """Returns the list of supported voice intents for UI hints."""
    return {
        "intents": [
            {
                "type": "navigate",
                "examples_es": ["Ir a inventario", "Ve a recetas", "Abre fermentación"],
                "examples_en": ["Go to inventory", "Open recipes"],
            },
            {
                "type": "search",
                "examples_es": ["Busca Cascade", "Busca levadura safale"],
                "examples_en": ["Search for Cascade hops"],
            },
            {
                "type": "adjust_stock",
                "examples_es": ["Añade 2 kg de malta pilsen", "Añadir 500 g de Cascade"],
                "examples_en": ["Add 2 kg of pilsen malt"],
            },
            {
                "type": "start_timer",
                "examples_es": ["Inicia temporizador de 60 minutos", "Temporizador de 1 hora"],
                "examples_en": ["Start 60 minute timer"],
            },
            {
                "type": "set_temperature",
                "examples_es": ["Temperatura a 68 grados", "Pon 20°C"],
                "examples_en": ["Set temperature to 68 degrees"],
            },
            {
                "type": "start_brew",
                "examples_es": ["Iniciar elaboración", "Nueva cocción"],
                "examples_en": ["Start new brew"],
            },
        ]
    }
