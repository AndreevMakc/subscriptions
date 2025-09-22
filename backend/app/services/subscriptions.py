"""Business logic helpers for subscriptions."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

from app.models.subscription import Subscription, SubscriptionStatus


def current_time() -> datetime:
    """Return timezone-aware current time."""

    return datetime.now(timezone.utc)


def normalize_price(value: Decimal | float | int) -> Decimal:
    """Round price to two decimal places."""

    decimal_value = value if isinstance(value, Decimal) else Decimal(str(value))
    return decimal_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def resolve_subscription_status(
    *,
    end_at: datetime,
    provided_status: SubscriptionStatus | None,
    existing_status: SubscriptionStatus | None = None,
    now: datetime | None = None,
) -> SubscriptionStatus:
    """Determine correct subscription status according to business rules."""

    now = now or current_time()
    status = provided_status or existing_status or SubscriptionStatus.active
    if status in {SubscriptionStatus.canceled, SubscriptionStatus.archived}:
        return status
    if end_at <= now:
        return SubscriptionStatus.expired
    if status == SubscriptionStatus.expired and end_at > now:
        return SubscriptionStatus.active
    return status


def calculate_next_reminder(
    *,
    end_at: datetime,
    status: SubscriptionStatus,
    last_notified_at: datetime | None,
    now: datetime | None = None,
) -> datetime | None:
    """Compute next reminder timestamp based on business logic."""

    now = now or current_time()
    if status in {SubscriptionStatus.canceled, SubscriptionStatus.archived}:
        return None

    prewindow_start = end_at - timedelta(days=7)
    if now < prewindow_start:
        return prewindow_start
    if end_at > now >= prewindow_start:
        return now

    reference = last_notified_at or end_at
    next_time = reference
    while next_time <= now:
        next_time = next_time + timedelta(days=1)
    return next_time


def apply_business_rules(subscription: Subscription, now: datetime | None = None) -> None:
    """Update subscription fields according to business rules."""

    now = now or current_time()
    subscription.status = resolve_subscription_status(
        end_at=subscription.end_at,
        provided_status=subscription.status,
        existing_status=None,
        now=now,
    )
    subscription.next_reminder_at = calculate_next_reminder(
        end_at=subscription.end_at,
        status=subscription.status,
        last_notified_at=subscription.last_notified_at,
        now=now,
    )
