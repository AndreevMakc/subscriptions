"""Telegram integration schemas."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TelegramLinkTokenResponse(BaseModel):
    """Response payload for generated Telegram link token."""

    token: str
    expires_at: datetime
    deep_link: str


class TelegramLinkCompleteRequest(BaseModel):
    """Request body for confirming Telegram link."""

    token: str
    telegram_chat_id: int = Field(..., gt=0)


class TelegramLinkCompleteResponse(BaseModel):
    """Response after linking Telegram."""

    id: UUID
    telegram_chat_id: int
    linked_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TelegramLinkStatusResponse(BaseModel):
    """Status payload describing whether Telegram is linked."""

    is_linked: bool
    linked_at: datetime | None
    telegram_chat_id: int | None
    bot_username: str | None
