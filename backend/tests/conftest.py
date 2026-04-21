# tests/conftest.py
"""
Shared fixtures for NeoStills v2 tests.

Uses an in-memory SQLite database for speed; async sessions managed by
pytest-asyncio.  The FastAPI app is overridden so every test hits the
disposable DB.
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from typing import Any
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.security import create_access_token, hash_password
from app.models.base import Base

# -- Async event-loop scope ---

@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for the whole test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# -- In-memory SQLite async engine ---

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DB_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Yields a fresh session that rolls back after each test."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


# -- App + client ---

@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provides an AsyncClient wired to the FastAPI app with a test DB."""
    from app.core.database import get_db
    from app.main import app

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# -- Seed helpers ---

@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> Any:
    """Create a test user + brewery and return (user, brewery, access_token)."""
    from app.models.brewery import Distillery
    from app.models.user import RoleEnum, User

    unique_suffix = uuid4().hex[:8]

    user = User(
        email=f"test-{unique_suffix}@neostills.es",
        hashed_password=hash_password("Test1234!"),
        full_name="Test Brewer",
        role=RoleEnum.admin,
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    brewery = Distillery(
        name="Test Distillery",
        owner_id=user.id,
    )
    db_session.add(brewery)
    await db_session.flush()

    token = create_access_token(user.id)
    return user, brewery, token


def auth_headers(token: str) -> dict[str, str]:
    """Convenience helper for Authorization header."""
    return {"Authorization": f"Bearer {token}"}
