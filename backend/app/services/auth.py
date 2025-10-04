"""Authentication helpers built around OAuth + JWT."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    TokenDecodeError,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User, UserSession


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_user_session(
    session: AsyncSession, user: User
) -> tuple[str, datetime, str, datetime, UserSession]:
    """Persist session and return freshly minted access/refresh tokens."""

    access_token, access_exp = create_access_token(
        user_id=str(user.id), email=user.email, email_verified=user.email_verified
    )
    refresh_token, refresh_exp = create_refresh_token(user_id=str(user.id))

    user_session = UserSession(
        user_id=user.id,
        access_token=access_token,
        refresh_token=refresh_token,
        access_expires_at=access_exp,
        refresh_expires_at=refresh_exp,
    )
    session.add(user_session)
    await session.flush()
    return access_token, access_exp, refresh_token, refresh_exp, user_session


async def rotate_session_tokens(
    session: AsyncSession,
    user_session: UserSession,
    user: User,
) -> tuple[str, datetime, str, datetime, UserSession]:
    """Rotate tokens for session returning the updated pair."""

    access_token, access_exp = create_access_token(
        user_id=str(user.id), email=user.email, email_verified=user.email_verified
    )
    refresh_token, refresh_exp = create_refresh_token(user_id=str(user.id))
    user_session.access_token = access_token
    user_session.refresh_token = refresh_token
    user_session.access_expires_at = access_exp
    user_session.refresh_expires_at = refresh_exp
    await session.flush()
    return access_token, access_exp, refresh_token, refresh_exp, user_session


async def get_user_by_refresh_token(
    session: AsyncSession, token: str
) -> tuple[User, UserSession] | None:
    """Return user/session when refresh token is valid and persisted."""

    try:
        payload = decode_token(token, expected_type="refresh")
    except TokenDecodeError:
        return None

    sub = payload.get("sub")
    if not sub:
        return None

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        return None

    result = await session.execute(
        select(User, UserSession)
        .join(UserSession, UserSession.user_id == User.id)
        .where(
            UserSession.user_id == user_id,
            UserSession.refresh_token == token,
            UserSession.refresh_expires_at > _now(),
        )
    )
    return result.one_or_none()


async def revoke_user_session(session: AsyncSession, session_id: uuid.UUID) -> None:
    await session.execute(delete(UserSession).where(UserSession.id == session_id))
