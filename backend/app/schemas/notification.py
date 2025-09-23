"""Notification related schemas."""
from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.subscription import NotificationChannel, NotificationStatus


class NotificationTestRequest(BaseModel):
    """Payload for sending test notification."""

    channel: NotificationChannel
    subscription_id: UUID | None = None
    email: EmailStr | None = None
    telegram_chat_id: int | None = Field(default=None, ge=0)
    message: str = Field(..., min_length=1, max_length=2000)


class NotificationTestResponse(BaseModel):
    """Response after creating notification record."""

    id: UUID
    channel: NotificationChannel
    status: NotificationStatus

    model_config = ConfigDict(from_attributes=True)
