#!/usr/bin/env python3
# backend/scripts/seed_data.py
"""
Creates the initial admin user and a demo brewery.
Run once after the first migration:
  docker compose exec backend python scripts/seed_data.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, RoleEnum
from app.models.brewery import Distillery
from app.models.base import Base


ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@neostills.es")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "Admin1234!")
ADMIN_NAME = os.getenv("SEED_ADMIN_NAME", "Admin NeoStills")


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        # Check if admin already exists
        result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Admin user already exists: {ADMIN_EMAIL}")
        else:
            admin = User(
                email=ADMIN_EMAIL,
                hashed_password=hash_password(ADMIN_PASSWORD),
                full_name=ADMIN_NAME,
                role=RoleEnum.admin,
                is_active=True,
            )
            session.add(admin)
            await session.flush()

            distillery = Distillery(
                name="NeoStills",
                description="Destilería principal",
                owner_id=admin.id,
            )
            session.add(distillery)
            await session.commit()
            print(f"✅ Admin created: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
            print(f"✅ Distillery created: NeoStills")
            print("⚠️  Change the admin password immediately after first login!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
