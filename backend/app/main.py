# backend/app/main.py
import logging
import time
import uuid
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from contextvars import ContextVar

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import engine
from app.core.redis import close_redis_pool
from app.models.base import Base
from app.api.v1 import auth as auth_router
from app.api.v1 import inventory as inventory_router
from app.api.v1 import purchases as purchases_router
from app.api.v1 import ai as ai_router
from app.api.v1 import voice as voice_router
from app.api.v1 import recipes as recipes_router
from app.api.v1 import brewing as brewing_router
from app.api.v1 import fermentation as fermentation_router
from app.api.v1 import prices as prices_router
from app.api.v1 import water as water_router
from app.api.v1 import calculators as calculators_router
from app.api.v1 import onboarding as onboarding_router
from app.api.v1 import aging_vessels as aging_vessels_router

# ─── Correlation ID context ───────────────────────────────────────────────────
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


# ─── Structured logging setup ────────────────────────────────────────────────
def setup_logging() -> None:
    """Configure structured JSON or text logging based on settings."""
    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    # Remove existing handlers
    for h in root.handlers[:]:
        root.removeHandler(h)

    handler = logging.StreamHandler()

    if settings.LOG_FORMAT == "json":
        from pythonjsonlogger.json import JsonFormatter

        class CorrelatedJsonFormatter(JsonFormatter):
            def add_fields(self, log_record, record, message_dict):
                super().add_fields(log_record, record, message_dict)
                log_record["request_id"] = request_id_var.get("-")
                log_record["service"] = "neostills-api"
                log_record["environment"] = settings.ENVIRONMENT

        handler.setFormatter(CorrelatedJsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
            rename_fields={"asctime": "timestamp", "levelname": "level"},
        ))
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s %(levelname)-5s [%(name)s] [%(request_id)s] %(message)s",
            defaults={"request_id": "-"},
        ))

    root.addHandler(handler)

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)


setup_logging()
logger = logging.getLogger(__name__)

# ─── Rate limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting NeoStills v2 API — %s", settings.ENVIRONMENT)
    # Create tables if they don't exist (Alembic handles production migrations)
    if settings.ENVIRONMENT == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Development: tables synced via SQLAlchemy")
    yield
    await close_redis_pool()
    await engine.dispose()
    logger.info("NeoStills v2 API shut down")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NeoStills API",
    version=settings.APP_VERSION,
    description="Craft Brewery Management System — v2",
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ─── CORS ─────────────────────────────────────────────────────────────────────
# NEVER wildcard in production — origins come from settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Accept-Language"],
)


# ─── Request logging middleware ───────────────────────────────────────────────

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate or read correlation ID
        rid = request.headers.get("X-Request-ID", uuid.uuid4().hex[:12])
        request_id_var.set(rid)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        # Inject correlation ID into response headers
        response.headers["X-Request-ID"] = rid

        # Skip health/docs endpoints to reduce noise
        path = request.url.path
        if not path.startswith(("/api/health", "/api/docs", "/api/redoc", "/openapi.json")):
            logger.info(
                "%s %s → %d (%.0fms)",
                request.method,
                path,
                response.status_code,
                duration_ms,
                extra={"method": request.method, "path": path, "status": response.status_code, "duration_ms": round(duration_ms)},
            )
        return response

app.add_middleware(RequestLoggingMiddleware)


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(inventory_router.router, prefix="/api/v1")
app.include_router(purchases_router.router, prefix="/api/v1")
app.include_router(ai_router.router, prefix="/api/v1")
app.include_router(voice_router.router, prefix="/api/v1")
app.include_router(recipes_router.router, prefix="/api/v1")
app.include_router(brewing_router.router, prefix="/api/v1")
app.include_router(fermentation_router.router, prefix="/api/v1")
app.include_router(prices_router.router, prefix="/api/v1")
app.include_router(water_router.router, prefix="/api/v1")
app.include_router(calculators_router.router, prefix="/api/v1")
app.include_router(onboarding_router.router, prefix="/api/v1")
app.include_router(aging_vessels_router.router, prefix="/api/v1")


# ─── Health & Version endpoints ───────────────────────────────────────────────
@app.get("/api/health", tags=["system"])
async def health_check() -> dict:
    return {"status": "ok", "service": "neostills-api", "version": settings.APP_VERSION}


@app.get("/api/version", tags=["system"])
async def version() -> dict:
    return {
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


# ─── 404 handler ─────────────────────────────────────────────────────────────
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": "Endpoint not found"},
    )


# ─── Unhandled exception handler (prevents stack trace leaks) ─────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )
