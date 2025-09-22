"""Subscription domain models."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SubscriptionStatus(enum.StrEnum):
    """Possible subscription statuses."""

    active = "active"
    canceled = "canceled"
    expired = "expired"
    archived = "archived"


class NotificationChannel(enum.StrEnum):
    """Notification delivery channels."""

    email = "email"
    telegram = "telegram"


class NotificationStatus(enum.StrEnum):
    """Notification delivery state."""

    sent = "sent"
    failed = "failed"


class AuditAction(enum.StrEnum):
    """Audit action names."""

    login = "login"
    logout = "logout"
    subscription_created = "subscription_created"
    subscription_updated = "subscription_updated"
    subscription_deleted = "subscription_deleted"
    subscription_status_changed = "subscription_status_changed"
    subscription_snoozed = "subscription_snoozed"
    telegram_link_created = "telegram_link_created"
    telegram_link_completed = "telegram_link_completed"
    notification_test = "notification_test"


subscription_status_enum = Enum(
    SubscriptionStatus, name="subscription_status", validate_strings=True
)
notification_channel_enum = Enum(
    NotificationChannel, name="notification_channel", validate_strings=True
)
notification_status_enum = Enum(
    NotificationStatus, name="notification_status", validate_strings=True
)
audit_action_enum = Enum(AuditAction, name="audit_action", validate_strings=True)


class Subscription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """User subscription entry."""

    __tablename__ = "subscriptions"
    __table_args__ = (
        Index("ix_subscriptions_user_status_end_at", "user_id", "status", "end_at"),
        Index("ix_subscriptions_next_reminder_at", "next_reminder_at"),
        Index("ix_subscriptions_last_notified_at", "last_notified_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    price_numeric: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(
        subscription_status_enum, default=SubscriptionStatus.active, nullable=False
    )
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    vendor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_reminder_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    notifications: Mapped[list[Notification]] = relationship(
        back_populates="subscription",
        cascade="all, delete-orphan",
    )


class Notification(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Notification entity."""

    __tablename__ = "notifications"

    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=True
    )
    channel: Mapped[NotificationChannel] = mapped_column(notification_channel_enum, nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(notification_status_enum, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    subscription: Mapped[Subscription | None] = relationship(back_populates="notifications")


class AuditLog(UUIDPrimaryKeyMixin, Base):
    """Audit log entry."""

    __tablename__ = "audit_log"

    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    action: Mapped[AuditAction] = mapped_column(audit_action_enum, nullable=False)
    entity: Mapped[str | None] = mapped_column(String(120), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
