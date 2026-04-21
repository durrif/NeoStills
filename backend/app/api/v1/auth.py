# backend/app/api/v1/auth.py
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    generate_invitation_token,
    get_current_user,
    hash_password,
    require_admin,
    verify_password,
)
from app.models.user import User, RoleEnum
from app.models.brewery import Distillery
from sqlalchemy.orm import selectinload

from app.schemas.auth import (
    InviteAcceptRequest,
    InviteRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.schemas.brewery import DistilleryOut, DistilleryCreate, DistilleryUpdate

router = APIRouter(prefix="/auth", tags=["auth"])

# Import limiter from main (will be attached to app.state at runtime)
from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)


# ─── Register (self-service) ──────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Registrar una cuenta nueva con su destilería por defecto."""
    # Check uniqueness
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=RoleEnum.brewer,
    )
    db.add(user)
    await db.flush()  # get user.id without full commit

    # Crear destilería por defecto
    distillery = Distillery(
        name=payload.brewery_name or f"destilería de {payload.full_name}",
        owner_id=user.id,
    )
    db.add(distillery)
    await db.commit()
    await db.refresh(user)
    await db.refresh(distillery)
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
        "user": UserOut.model_validate(user).model_dump(),
        "brewery": DistilleryOut.model_validate(distillery).model_dump(),
    }


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    # Obtener destilería del usuario
    distillery_result = await db.execute(
        select(Distillery).where(Distillery.owner_id == user.id)
    )
    distillery = distillery_result.scalar_one_or_none()

    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
        "user": UserOut.model_validate(user).model_dump(),
        "distillery": DistilleryOut.model_validate(distillery).model_dump() if distillery else None,
    }


# ─── Refresh ──────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> dict:
    user_id = decode_refresh_token(payload.refresh_token)
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),  # rotate refresh token
        "token_type": "bearer",
    }


# ─── Me ───────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the currently authenticated user's profile."""
    return current_user


@router.get("/me/full")
async def get_me_full(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Devolver perfil de usuario + destilería en una llamada (bootstrap)."""
    distillery_result = await db.execute(
        select(Distillery).where(Distillery.owner_id == current_user.id)
    )
    distillery = distillery_result.scalar_one_or_none()
    return {
        "user": UserOut.model_validate(current_user).model_dump(),
        "distillery": DistilleryOut.model_validate(distillery).model_dump() if distillery else None,
    }


# ─── Invite (admin only) ──────────────────────────────────────────────────────

@router.post("/invite", response_model=dict, status_code=status.HTTP_201_CREATED)
async def invite_brewer(
    payload: InviteRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Admin invites a brewer by email. Sends a one-time registration link."""
    # Check if already exists
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    token = generate_invitation_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.INVITATION_EXPIRE_HOURS)

    # Create a pending (inactive) user
    invited_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password="",  # will be set when invitation is accepted
        role=RoleEnum.brewer,
        is_active=False,
        invitation_token=token,
        invitation_expires_at=expires_at,
        invited_by_id=admin.id,
    )
    db.add(invited_user)
    await db.commit()

    # TODO: background_tasks.add_task(send_invitation_email, payload.email, token)
    # Email sending deferred — SMTP config + fastapi-mail integration pending

    response: dict = {
        "message": f"Invitation sent to {payload.email}",
        "expires_at": expires_at.isoformat(),
    }
    # Only expose token in development for testing — NEVER in production
    if settings.ENVIRONMENT == "development":
        response["invitation_token"] = token
    return response


# ─── Accept Invitation ────────────────────────────────────────────────────────

@router.post("/invite/accept", response_model=TokenResponse)
async def accept_invitation(
    payload: InviteAcceptRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    """Invited user sets their password via the one-time token."""
    result = await db.execute(
        select(User).where(User.invitation_token == payload.token)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="Invalid invitation token")

    if user.invitation_expires_at and user.invitation_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation token has expired")

    # Activate user and set password
    user.hashed_password = hash_password(payload.password)
    user.is_active = True
    user.invitation_token = None
    user.invitation_expires_at = None

    # Crear destilería por defecto
    distillery = Distillery(
        name=f"destilería de {user.full_name}",
        owner_id=user.id,
    )
    db.add(distillery)
    await db.commit()

    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }
