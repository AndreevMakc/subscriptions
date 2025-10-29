"""Celery tasks for background processing."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_sessionmaker
from app.models.subscription import (
    Notification,
    NotificationChannel,
    NotificationStatus,
    Subscription,
    SubscriptionStatus,
)
from app.models.user import TelegramAccount, User
from app.services.subscriptions import calculate_next_reminder, current_time
from app.services.telegram_bot import send_subscription_notification
from app.workers.celery_app import celery_app


logger = logging.getLogger(__name__)


@celery_app.task(name="subscriptions.ping")
def ping() -> str:
    """Lightweight task to verify worker availability."""

    return "pong"


@celery_app.task(name="subscriptions.reminders.dispatch_due")
def dispatch_due_reminders() -> None:
    """Entry point that triggers processing of due reminders."""

    asyncio.run(_dispatch_due_reminders())


async def _dispatch_due_reminders() -> None:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        now = current_time()
        rows = await _load_due_subscriptions(session=session, now=now)
        if not rows:
            return

        for subscription, user, account in rows:
            await _process_subscription_reminder(
                session=session,
                subscription=subscription,
                user=user,
                account=account,
                now=now,
            )

        await session.commit()


async def _load_due_subscriptions(
    *, session: AsyncSession, now: datetime
) -> list[tuple[Subscription, User, TelegramAccount]]:
    stmt = (
        select(Subscription, User, TelegramAccount)
        .join(User, Subscription.user_id == User.id)
        .join(
            TelegramAccount,
            and_(
                TelegramAccount.user_id == User.id,
                TelegramAccount.is_active.is_(True),
            ),
        )
        .where(
            Subscription.next_reminder_at.isnot(None),
            Subscription.next_reminder_at <= now,
            Subscription.status.in_(
                [SubscriptionStatus.active, SubscriptionStatus.expired]
            ),
        )
        .order_by(Subscription.next_reminder_at.asc())
    )
    result = await session.execute(stmt)
    return result.all()


async def _process_subscription_reminder(
    *,
    session: AsyncSession,
    subscription: Subscription,
    user: User,
    account: TelegramAccount,
    now: datetime,
) -> None:
    if not await _should_send_notification(session=session, subscription=subscription, now=now):
        subscription.next_reminder_at = calculate_next_reminder(
            end_at=subscription.end_at,
            status=subscription.status,
            last_notified_at=subscription.last_notified_at,
            now=now,
            user_timezone=user.tz,
        )
        return

    try:
        await send_subscription_notification(chat_id=account.telegram_chat_id, subscription=subscription)
        delivery_status = NotificationStatus.sent
        error_message = None
    except Exception as exc:  # pragma: no cover - network/runtime errors
        logger.exception(
            "Failed to send Telegram notification", extra={"subscription_id": str(subscription.id)}
        )
        delivery_status = NotificationStatus.failed
        error_message = str(exc)

    notification = Notification(
        subscription_id=subscription.id,
        channel=NotificationChannel.telegram,
        status=delivery_status,
        sent_at=now,
        error=error_message,
    )
    session.add(notification)

    if delivery_status is NotificationStatus.sent:
        subscription.last_notified_at = now
        subscription.next_reminder_at = calculate_next_reminder(
            end_at=subscription.end_at,
            status=subscription.status,
            last_notified_at=subscription.last_notified_at,
            now=now,
            user_timezone=user.tz,
        )


async def _should_send_notification(
    *, session: AsyncSession, subscription: Subscription, now: datetime
) -> bool:
    threshold = now - timedelta(hours=24)
    stmt = (
        select(Notification.sent_at)
        .where(
            Notification.subscription_id == subscription.id,
            Notification.channel == NotificationChannel.telegram,
            Notification.status == NotificationStatus.sent,
        )
        .order_by(Notification.sent_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    last_sent = result.scalar_one_or_none()
    if last_sent is None:
        return True
    return last_sent <= threshold
