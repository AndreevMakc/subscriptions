"""Business logic helpers for subscriptions."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from app.models.subscription import Subscription, SubscriptionStatus

REMINDER_WINDOW_DAYS = 7
REMINDER_INTERVAL = timedelta(days=1)


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


def _resolve_zone(user_timezone: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(user_timezone or "Europe/Moscow")
    except Exception:  # pragma: no cover - fallback for invalid tz
        return ZoneInfo("Europe/Moscow")


def calculate_next_reminder(
    *,
    end_at: datetime,
    status: SubscriptionStatus,
    last_notified_at: datetime | None,
    now: datetime | None = None,
    user_timezone: str | None = None,
) -> datetime | None:
    """Compute next reminder timestamp based on business logic."""

    if status in {SubscriptionStatus.canceled, SubscriptionStatus.archived}:
        return None

    tz = _resolve_zone(user_timezone)
    now_utc = now or current_time()
    localized_now = now_utc.astimezone(tz)
    localized_end = end_at.astimezone(tz)

    window_start = localized_end - timedelta(days=REMINDER_WINDOW_DAYS)
    if localized_now < window_start:
        return window_start.astimezone(timezone.utc)

    if last_notified_at is None:
        # Окно напоминаний открыто, первое уведомление должно уйти немедленно.
        return localized_now.astimezone(timezone.utc)

    reference = last_notified_at.astimezone(tz) + REMINDER_INTERVAL
    while reference <= localized_now:
        reference += REMINDER_INTERVAL
    return reference.astimezone(timezone.utc)


def apply_business_rules(
    subscription: Subscription, now: datetime | None = None, user_timezone: str | None = None
) -> None:
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
        user_timezone=user_timezone,
    )
