# backend/app/api/v1/brewing.py
"""
Lotes de destilación — CRUD, avance de fase y WebSocket en tiempo real.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import decode_access_token
from app.schemas.brewing import PhaseAdvance, RunCreate, RunOut, RunUpdate
from app.models.brew_session import DistillationRun, SessionPhase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/distillation", tags=["Destilación"])


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[RunOut])
async def list_runs(
    phase_filter: SessionPhase | None = None,
    skip: int = 0,
    limit: int = 20,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    distillery = current_user.distillery
    if not distillery:
        raise HTTPException(status_code=400, detail="No se encontró destilería")

    q = select(DistillationRun).where(DistillationRun.distillery_id == distillery.id)
    if phase_filter:
        q = q.where(DistillationRun.phase == phase_filter)
    q = q.order_by(DistillationRun.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=RunOut, status_code=status.HTTP_201_CREATED)
async def create_run(
    data: RunCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    distillery = current_user.distillery
    if not distillery:
        raise HTTPException(status_code=400, detail="No se encontró destilería")

    run_obj = DistillationRun(
        distillery_id=distillery.id,
        **data.model_dump(),
    )
    db.add(run_obj)
    await db.commit()
    await db.refresh(run_obj)
    return run_obj


@router.get("/active", response_model=RunOut | None)
async def get_active_run(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve el lote activo más reciente (no planificado, no completado)."""
    distillery = current_user.distillery
    if not distillery:
        raise HTTPException(status_code=400, detail="No se encontró destilería")

    active_phases = [
        SessionPhase.mashing,
        SessionPhase.fermenting,
        SessionPhase.stripping_run,
        SessionPhase.spirit_run,
        SessionPhase.cuts_collection,
        SessionPhase.aging,
        SessionPhase.bottling,
    ]
    result = await db.scalar(
        select(DistillationRun)
        .where(
            DistillationRun.distillery_id == distillery.id,
            DistillationRun.phase.in_(active_phases),
        )
        .order_by(DistillationRun.updated_at.desc())
    )
    return result


@router.get("/{run_id}", response_model=RunOut)
async def get_run(
    run_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    run_obj = await db.scalar(
        select(DistillationRun).where(
            DistillationRun.id == run_id,
            DistillationRun.distillery_id == current_user.distillery.id,
        )
    )
    if not run_obj:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return run_obj


@router.patch("/{run_id}", response_model=RunOut)
async def update_run(
    run_id: int,
    data: RunUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    run_obj = await db.scalar(
        select(DistillationRun).where(
            DistillationRun.id == run_id,
            DistillationRun.distillery_id == current_user.distillery.id,
        )
    )
    if not run_obj:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(run_obj, field, value)
    await db.commit()
    await db.refresh(run_obj)
    return run_obj


@router.post("/{run_id}/advance", response_model=RunOut)
async def advance_phase(
    run_id: int,
    body: PhaseAdvance,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Avanzar (o establecer) la fase del lote y registrar entrada en el log."""
    run_obj = await db.scalar(
        select(DistillationRun).where(
            DistillationRun.id == run_id,
            DistillationRun.distillery_id == current_user.distillery.id,
        )
    )
    if not run_obj:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    old_phase = run_obj.phase
    run_obj.phase = body.phase

    log = list(run_obj.step_log or [])
    log.append({
        "from": old_phase.value,
        "to": body.phase.value,
        "at": datetime.now(timezone.utc).isoformat(),
        "notes": body.notes,
    })
    run_obj.step_log = log

    await db.commit()
    await db.refresh(run_obj)
    return run_obj


@router.delete("/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_run(
    run_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    run_obj = await db.scalar(
        select(DistillationRun).where(
            DistillationRun.id == run_id,
            DistillationRun.distillery_id == current_user.distillery.id,
        )
    )
    if not run_obj:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    await db.delete(run_obj)
    await db.commit()


# ---------------------------------------------------------------------------
# WebSocket — feed en tiempo real de fase y temporizadores
# ---------------------------------------------------------------------------

_ws_connections: dict[int, list[WebSocket]] = {}


@router.websocket("/{run_id}/ws")
async def run_websocket(
    run_id: int,
    websocket: WebSocket,
    token: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket para el feed en tiempo real del lote.
    Auth via query param: ws://host/api/v1/distillation/1/ws?token=<JWT>
    """
    if not token:
        await websocket.close(code=4001, reason="Token de autenticación requerido")
        return
    try:
        decode_access_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Token de autenticación inválido")
        return
    await websocket.accept()
    _ws_connections.setdefault(run_id, []).append(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            for ws in list(_ws_connections.get(run_id, [])):
                if ws is not websocket:
                    try:
                        await ws.send_json(data)
                    except (WebSocketDisconnect, RuntimeError):
                        _ws_connections[run_id].remove(ws)
    except WebSocketDisconnect:
        conns = _ws_connections.get(run_id, [])
        if websocket in conns:
            conns.remove(websocket)

