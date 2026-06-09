"""
Grant admin privileges to a user by email.

Usage:
    .venv/bin/python make_admin.py user@example.com
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.config import settings
from app.models.user import User


async def main(email: str):
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"Error: no user found with email '{email}'")
            sys.exit(1)

        user.is_admin = True
        db.add(user)
        await db.commit()
        print(f"OK: {email} is now an admin")

    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: .venv/bin/python make_admin.py <email>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
