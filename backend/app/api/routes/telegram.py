"""Telegram linking endpoints."""
from __future__ import annotations

import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.subscription import AuditAction
from app.models.user import TelegramAccount, TelegramLinkToken, User
from app.schemas.telegram import (
    TelegramLinkCompleteRequest,
    TelegramLinkCompleteResponse,
    TelegramLinkTokenResponse,
)
from app.services.audit import record_audit_log
from app.services.subscriptions import current_time

router = APIRouter(prefix="/api/v1/telegram", tags=["telegram"])


def _build_deep_link(token: str) -> str:
    if settings.telegram_bot_name:
        return f"https://t.me/{settings.telegram_bot_name}?start={token}"
    return f"{settings.base_url.rstrip('/')}/telegram/link?token={token}"


@router.post("/link-token", response_model=TelegramLinkTokenResponse, summary="Generate Telegram link token")
async def create_link_token(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TelegramLinkTokenResponse:
    """Create one-time Telegram linking token for authenticated user."""

    token = secrets.token_urlsafe(16)
    expires_at = current_time() + timedelta(minutes=10)
    link_token = TelegramLinkToken(
        user_id=current_user.id,
        token=token,
        expires_at=expires_at,
    )
    session.add(link_token)
    await session.flush()
    await record_audit_log(
        session,
        user_id=current_user.id,
        action=AuditAction.telegram_link_created,
        entity="telegram_link_token",
        entity_id=link_token.id,
    )
    await session.commit()

    deep_link = _build_deep_link(token)
    return TelegramLinkTokenResponse(token=token, expires_at=expires_at, deep_link=deep_link)


@router.post("/link", response_model=TelegramLinkCompleteResponse, summary="Confirm Telegram link")
async def complete_link(
    payload: TelegramLinkCompleteRequest,
    session: AsyncSession = Depends(get_db),
) -> TelegramLinkCompleteResponse:
    """Confirm Telegram linking using token from Telegram deep-link."""

    result = await session.execute(
        select(TelegramLinkToken).where(TelegramLinkToken.token == payload.token)
    )
    link_token = result.scalar_one_or_none()
    now = current_time()
    if link_token is None or link_token.expires_at < now or link_token.used_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired link token")

    link_token.used_at = now
    account_result = await session.execute(
        select(TelegramAccount).where(TelegramAccount.user_id == link_token.user_id)
    )
    account = account_result.scalar_one_or_none()
    if account is None:
        account = TelegramAccount(
            user_id=link_token.user_id,
            telegram_chat_id=payload.telegram_chat_id,
            linked_at=now,
            is_active=True,
        )
        session.add(account)
    else:
        account.telegram_chat_id = payload.telegram_chat_id
        account.linked_at = now
        account.is_active = True

    await session.flush()
    await record_audit_log(
        session,
        user_id=link_token.user_id,
        action=AuditAction.telegram_link_completed,
        entity="telegram_account",
        entity_id=account.id,
    )
    await session.commit()
    await session.refresh(account)

    return TelegramLinkCompleteResponse.model_validate(account)
