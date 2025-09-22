"""Subscription schemas."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.subscription import SubscriptionStatus


class SubscriptionBase(BaseModel):
    """Shared subscription fields."""

    name: str = Field(..., min_length=1, max_length=255)
    price: Decimal = Field(..., ge=0)
    currency: str = Field(..., min_length=3, max_length=3)
    end_at: datetime
    category: str | None = Field(default=None, max_length=120)
    vendor: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str) -> str:
        return value.upper()


class SubscriptionCreate(SubscriptionBase):
    """Payload for creating a subscription."""

    status: SubscriptionStatus | None = None


class SubscriptionUpdate(BaseModel):
    """Payload for full subscription update."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    end_at: datetime | None = None
    category: str | None = Field(default=None, max_length=120)
    vendor: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=5000)
    status: SubscriptionStatus | None = None

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class SubscriptionStatusUpdate(BaseModel):
    """Payload for updating subscription status."""

    status: SubscriptionStatus


class SubscriptionRead(BaseModel):
    """Representation of subscription returned to clients."""

    id: UUID
    user_id: UUID
    name: str
    price: Decimal
    currency: str
    end_at: datetime
    status: SubscriptionStatus
    category: str | None
    vendor: str | None
    notes: str | None
    next_reminder_at: datetime | None
    last_notified_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={Decimal: lambda value: format(value, "0.2f")},
    )
