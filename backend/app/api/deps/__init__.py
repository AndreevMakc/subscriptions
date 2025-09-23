"""FastAPI dependencies."""
from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_sessionmaker
from app.models.user import User, UserSession
from app.services.auth import get_user_by_access_token

security_scheme = HTTPBearer(auto_error=False)

_DEFAULT_USER_EMAIL = "demo@example.com"


async def get_db() -> AsyncIterator[AsyncSession]:
    """Provide database session dependency."""

    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        yield session


async def _get_or_create_default_user(session: AsyncSession) -> User:
    """Return existing user or create a default demo user."""

    result = await session.execute(select(User).order_by(User.created_at).limit(1))
    user = result.scalars().first()
    if user is not None:
        return user

    user = User(email=_DEFAULT_USER_EMAIL, email_verified=True)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    """Retrieve current user allowing anonymous access for development."""

    if credentials is None:
        return await _get_or_create_default_user(session)

    row = await get_user_by_access_token(session, credentials.credentials)
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user, _ = row
    return user


async def get_current_user_and_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    session: AsyncSession = Depends(get_db),
) -> tuple[User, UserSession | None]:
    """Return current user and their active session if present."""

    if credentials is None:
        user = await _get_or_create_default_user(session)
        return user, None
    row = await get_user_by_access_token(session, credentials.credentials)
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user, user_session = row
    return user, user_session
