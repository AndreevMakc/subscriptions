"""Shared helpers for Telegram account linking."""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import TelegramAccount, TelegramLinkToken
from app.services.subscriptions import current_time

_LINK_TOKEN_TTL = timedelta(minutes=10)


async def create_link_token(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    ttl: timedelta = _LINK_TOKEN_TTL,
) -> TelegramLinkToken:
    """Create and return a one-time Telegram link token."""

    now = current_time()
    expires_at = now + ttl
    token_value = secrets.token_urlsafe(16)

    link_token = TelegramLinkToken(
        user_id=user_id,
        token=token_value,
        expires_at=expires_at,
    )
    session.add(link_token)
    await session.flush()
    return link_token


async def complete_telegram_link(
    session: AsyncSession,
    *,
    token: str,
    chat_id: int,
) -> TelegramAccount | None:
    """Mark link token as used and ensure TelegramAccount exists."""

    result = await session.execute(
        select(TelegramLinkToken).where(TelegramLinkToken.token == token)
    )
    link_token = result.scalar_one_or_none()
    now = current_time()
    if link_token is None or link_token.expires_at < now or link_token.used_at is not None:
        return None

    link_token.used_at = now

    account_result = await session.execute(
        select(TelegramAccount).where(TelegramAccount.user_id == link_token.user_id)
    )
    account = account_result.scalar_one_or_none()

    if account is None:
        account = TelegramAccount(
            user_id=link_token.user_id,
            telegram_chat_id=chat_id,
            linked_at=now,
            is_active=True,
        )
        session.add(account)
    else:
        account.telegram_chat_id = chat_id
        account.linked_at = now
        account.is_active = True
    await session.flush()
    return account
