"""Authentication helpers."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserSession
from app.services.jwt import (
    TokenType,
    TokenValidationError,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def _now() -> datetime:
    """Return current UTC time."""

    return datetime.now(timezone.utc)


async def create_user_session(session: AsyncSession, user: User) -> UserSession:
    """Create a new user session with JWT access and refresh tokens."""

    session_id = uuid.uuid4()
    access_token, access_expires_at = create_access_token(subject=user.id, session_id=session_id)
    refresh_token, refresh_expires_at = create_refresh_token(subject=user.id, session_id=session_id)

    user_session = UserSession(
        id=session_id,
        user_id=user.id,
        access_token=access_token,
        refresh_token=refresh_token,
        access_expires_at=access_expires_at,
        refresh_expires_at=refresh_expires_at,
    )
    session.add(user_session)
    await session.flush()
    return user_session


async def _get_session_with_user(
    session: AsyncSession, session_id: uuid.UUID
) -> tuple[User, UserSession] | None:
    result = await session.execute(
        select(User, UserSession)
        .join(UserSession, UserSession.user_id == User.id)
        .where(UserSession.id == session_id)
    )
    row = result.one_or_none()
    return row


async def get_user_by_access_token(
    session: AsyncSession, token: str
) -> tuple[User, UserSession] | None:
    """Return user and session by access token if valid."""

    try:
        payload = decode_token(token, expected_type=TokenType.access)
        session_id = uuid.UUID(payload["sid"])
    except (KeyError, ValueError, TokenValidationError):
        return None

    row = await _get_session_with_user(session, session_id)
    if row is None:
        return None

    user, user_session = row
    if user_session.access_expires_at <= _now():
        return None
    if user_session.access_token != token:
        return None
    return user, user_session


async def get_user_by_refresh_token(
    session: AsyncSession, token: str
) -> tuple[User, UserSession] | None:
    """Return user and session by refresh token if valid."""

    try:
        payload = decode_token(token, expected_type=TokenType.refresh)
        session_id = uuid.UUID(payload["sid"])
    except (KeyError, ValueError, TokenValidationError):
        return None

    row = await _get_session_with_user(session, session_id)
    if row is None:
        return None

    user, user_session = row
    if user_session.refresh_expires_at <= _now():
        return None
    if user_session.refresh_token != token:
        return None
    return user, user_session


async def rotate_session_tokens(
    session: AsyncSession,
    user_session: UserSession,
) -> UserSession:
    """Rotate access and refresh tokens for session."""

    new_access, access_expires_at = create_access_token(subject=user_session.user_id, session_id=user_session.id)
    new_refresh, refresh_expires_at = create_refresh_token(subject=user_session.user_id, session_id=user_session.id)
    user_session.access_token = new_access
    user_session.refresh_token = new_refresh
    user_session.access_expires_at = access_expires_at
    user_session.refresh_expires_at = refresh_expires_at
    await session.flush()
    return user_session


async def revoke_user_session(session: AsyncSession, session_id: uuid.UUID) -> None:
    """Revoke an existing session."""

    await session.execute(delete(UserSession).where(UserSession.id == session_id))
