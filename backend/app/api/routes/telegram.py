"""Telegram linking and webhook endpoints."""
from __future__ import annotations

from json import JSONDecodeError

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from telegram import Update

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.subscription import AuditAction
from app.models.user import User
from app.schemas.telegram import (
    TelegramLinkCompleteRequest,
    TelegramLinkCompleteResponse,
    TelegramLinkTokenResponse,
)
from app.services.audit import record_audit_log
from app.services.telegram_bot import ensure_application_ready, process_update
from app.services.telegram_link import complete_telegram_link, create_link_token

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

    link_token = await create_link_token(session, user_id=current_user.id)
    await record_audit_log(
        session,
        user_id=current_user.id,
        action=AuditAction.telegram_link_created,
        entity="telegram_link_token",
        entity_id=link_token.id,
    )
    await session.commit()

    deep_link = _build_deep_link(link_token.token)
    return TelegramLinkTokenResponse(
        token=link_token.token,
        expires_at=link_token.expires_at,
        deep_link=deep_link,
    )


@router.post("/link", response_model=TelegramLinkCompleteResponse, summary="Confirm Telegram link")
async def complete_link(
    payload: TelegramLinkCompleteRequest,
    session: AsyncSession = Depends(get_db),
) -> TelegramLinkCompleteResponse:
    """Confirm Telegram linking using token from Telegram deep-link."""

    account = await complete_telegram_link(
        session,
        token=payload.token,
        chat_id=payload.telegram_chat_id,
    )
    if account is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired link token")

    await record_audit_log(
        session,
        user_id=account.user_id,
        action=AuditAction.telegram_link_completed,
        entity="telegram_account",
        entity_id=account.id,
    )
    await session.commit()
    await session.refresh(account)

    return TelegramLinkCompleteResponse.model_validate(account)


@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT, summary="Telegram webhook receiver")
async def telegram_webhook(request: Request) -> Response:
    """Process webhook updates from Telegram with header validation."""

    if not settings.telegram_bot_token or not settings.telegram_webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Telegram bot not configured")

    secret_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if secret_token != settings.telegram_webhook_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid webhook signature")

    try:
        payload = await request.json()
    except JSONDecodeError as exc:  # pragma: no cover - FastAPI validated
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed payload") from exc

    application = await ensure_application_ready()
    update = Update.de_json(data=payload, bot=application.bot)
    await process_update(update)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
