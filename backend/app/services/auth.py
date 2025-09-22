"""Authentication helpers."""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User, UserSession


def _now() -> datetime:
    """Return current UTC time."""

    return datetime.now(timezone.utc)


async def create_user_session(session: AsyncSession, user: User) -> UserSession:
    """Create a new user session with tokens."""

    now = _now()
    access_expires = now + timedelta(minutes=settings.access_token_expires_minutes)
    refresh_expires = now + timedelta(minutes=settings.refresh_token_expires_minutes)
    user_session = UserSession(
        user_id=user.id,
        access_token=secrets.token_urlsafe(32),
        refresh_token=secrets.token_urlsafe(48),
        access_expires_at=access_expires,
        refresh_expires_at=refresh_expires,
    )
    session.add(user_session)
    await session.flush()
    return user_session


async def get_user_by_access_token(
    session: AsyncSession, token: str
) -> tuple[User, UserSession] | None:
    """Return user and session by access token if valid."""

    now = _now()
    result = await session.execute(
        select(User, UserSession)
        .join(UserSession, UserSession.user_id == User.id)
        .where(UserSession.access_token == token, UserSession.access_expires_at > now)
    )
    row = result.one_or_none()
    if row:
        return row
    return None


async def get_user_by_refresh_token(
    session: AsyncSession, token: str
) -> tuple[User, UserSession] | None:
    """Return user and session by refresh token if valid."""

    now = _now()
    result = await session.execute(
        select(User, UserSession)
        .join(UserSession, UserSession.user_id == User.id)
        .where(UserSession.refresh_token == token, UserSession.refresh_expires_at > now)
    )
    row = result.one_or_none()
    if row:
        return row
    return None


async def rotate_session_tokens(
    session: AsyncSession,
    user_session: UserSession,
) -> UserSession:
    """Rotate access and refresh tokens for session."""

    now = _now()
    user_session.access_token = secrets.token_urlsafe(32)
    user_session.refresh_token = secrets.token_urlsafe(48)
    user_session.access_expires_at = now + timedelta(minutes=settings.access_token_expires_minutes)
    user_session.refresh_expires_at = now + timedelta(minutes=settings.refresh_token_expires_minutes)
    await session.flush()
    return user_session


async def revoke_user_session(session: AsyncSession, session_id: uuid.UUID) -> None:
    """Revoke an existing session."""

    await session.execute(delete(UserSession).where(UserSession.id == session_id))
