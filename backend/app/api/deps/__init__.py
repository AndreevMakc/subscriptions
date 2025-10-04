"""FastAPI dependencies."""
from __future__ import annotations

from collections.abc import AsyncIterator
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import TokenDecodeError, decode_token
from app.db.session import get_sessionmaker
from app.models.user import User, UserSession

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
        if settings.environment.lower() == "development":
            return await _get_or_create_default_user(session)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")

    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except TokenDecodeError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from None

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    try:
        user_uuid = uuid.UUID(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await session.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")
    return user


async def get_current_user_and_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    session: AsyncSession = Depends(get_db),
) -> tuple[User, UserSession | None]:
    """Return current user and their active session if present."""

    if credentials is None:
        if settings.environment.lower() == "development":
            user = await _get_or_create_default_user(session)
            return user, None
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")

    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except TokenDecodeError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from None

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    try:
        user_uuid = uuid.UUID(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = (await session.execute(select(User).where(User.id == user_uuid))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    session_result = await session.execute(
        select(UserSession).where(UserSession.access_token == credentials.credentials)
    )
    user_session = session_result.scalar_one_or_none()
    return user, user_session
