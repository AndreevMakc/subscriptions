"""Subscription endpoints."""
from __future__ import annotations

from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.subscription import AuditAction, Subscription, SubscriptionStatus
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionRead,
    SubscriptionStatusUpdate,
    SubscriptionUpdate,
)
from app.services.audit import record_audit_log
from app.services.subscriptions import (
    calculate_next_reminder,
    current_time,
    normalize_price,
    resolve_subscription_status,
)

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])


async def _get_subscription_or_404(
    session: AsyncSession, subscription_id: UUID, user_id: UUID
) -> Subscription:
    result = await session.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.user_id == user_id,
        )
    )
    subscription = result.scalar_one_or_none()
    if subscription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    return subscription


@router.get("", response_model=list[SubscriptionRead], summary="List subscriptions")
async def list_subscriptions(
    status_filter: SubscriptionStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, description="Search query"),
    soon: bool = Query(default=False, description="Only subscriptions with upcoming reminders"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Subscription]:
    """Return list of subscriptions for current user with optional filters."""

    stmt = select(Subscription).where(Subscription.user_id == current_user.id)
    if status_filter is not None:
        stmt = stmt.where(Subscription.status == status_filter)
    if q:
        like_pattern = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Subscription.name).like(like_pattern),
                func.lower(Subscription.vendor).like(like_pattern),
                func.lower(Subscription.category).like(like_pattern),
            )
        )
    if soon:
        now = current_time()
        horizon = now + timedelta(days=7)
        stmt = stmt.where(
            Subscription.next_reminder_at.isnot(None),
            Subscription.next_reminder_at <= horizon,
        )
    stmt = stmt.order_by(Subscription.end_at.asc())
    result = await session.scalars(stmt)
    return list(result)


@router.post("", response_model=SubscriptionRead, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    payload: SubscriptionCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    """Create new subscription for current user."""

    now = current_time()
    status_value = resolve_subscription_status(
        end_at=payload.end_at,
        provided_status=payload.status,
        existing_status=None,
        now=now,
    )
    subscription = Subscription(
        user_id=current_user.id,
        name=payload.name,
        price_numeric=normalize_price(payload.price),
        currency=payload.currency,
        end_at=payload.end_at,
        status=status_value,
        category=payload.category,
        vendor=payload.vendor,
        notes=payload.notes,
    )
    subscription.last_notified_at = payload.last_notified_at
    if "next_reminder_at" in payload.model_fields_set:
        subscription.next_reminder_at = payload.next_reminder_at
    else:
        subscription.next_reminder_at = calculate_next_reminder(
            end_at=subscription.end_at,
            status=subscription.status,
            last_notified_at=subscription.last_notified_at,
            now=now,
            user_timezone=current_user.tz,
        )
    session.add(subscription)
    await session.flush()
    await record_audit_log(
        session,
        user_id=current_user.id,
        action=AuditAction.subscription_created,
        entity="subscription",
        entity_id=subscription.id,
        meta={"status": str(subscription.status)},
    )
    await session.commit()
    await session.refresh(subscription)
    return subscription


@router.get("/{subscription_id}", response_model=SubscriptionRead)
async def get_subscription(
    subscription_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    """Retrieve subscription by id."""

    subscription = await _get_subscription_or_404(session, subscription_id, current_user.id)
    return subscription


@router.put("/{subscription_id}", response_model=SubscriptionRead)
async def put_subscription(
    subscription_id: UUID,
    payload: SubscriptionCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    """Replace subscription with new payload."""

    subscription = await _get_subscription_or_404(session, subscription_id, current_user.id)
    return await _update_subscription(subscription, payload.model_dump(), session, current_user)


@router.patch("/{subscription_id}", response_model=SubscriptionRead)
async def patch_subscription(
    subscription_id: UUID,
    payload: SubscriptionUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    """Partially update subscription."""

    subscription = await _get_subscription_or_404(session, subscription_id, current_user.id)
    update_data = payload.model_dump(exclude_unset=True)
    return await _update_subscription(subscription, update_data, session, current_user)


async def _update_subscription(
    subscription: Subscription,
    update_data: dict,
    session: AsyncSession,
    current_user: User,
) -> Subscription:
    now = current_time()
    previous_status = subscription.status

    if "name" in update_data and update_data["name"] is not None:
        subscription.name = update_data["name"]
    if "price" in update_data and update_data["price"] is not None:
        subscription.price_numeric = normalize_price(update_data["price"])
    if "currency" in update_data and update_data["currency"] is not None:
        subscription.currency = update_data["currency"]
    if "end_at" in update_data and update_data["end_at"] is not None:
        subscription.end_at = update_data["end_at"]
    if "category" in update_data:
        subscription.category = update_data.get("category")
    if "vendor" in update_data:
        subscription.vendor = update_data.get("vendor")
    if "notes" in update_data:
        subscription.notes = update_data.get("notes")

    provided_status = update_data.get("status") if "status" in update_data else None
    subscription.status = resolve_subscription_status(
        end_at=subscription.end_at,
        provided_status=provided_status,
        existing_status=previous_status,
        now=now,
    )
    if "last_notified_at" in update_data:
        subscription.last_notified_at = update_data.get("last_notified_at")

    next_reminder_override = update_data.get("next_reminder_at", None)
    if (
        "next_reminder_at" in update_data
        and next_reminder_override is not None
        and next_reminder_override != subscription.next_reminder_at
    ):
        subscription.next_reminder_at = next_reminder_override
    else:
        subscription.next_reminder_at = calculate_next_reminder(
            end_at=subscription.end_at,
            status=subscription.status,
            last_notified_at=subscription.last_notified_at,
            now=now,
            user_timezone=current_user.tz,
        )

    await session.flush()
    await record_audit_log(
        session,
        user_id=current_user.id,
        action=AuditAction.subscription_updated,
        entity="subscription",
        entity_id=subscription.id,
        meta={"status": str(subscription.status)},
    )
    await session.commit()
    await session.refresh(subscription)
    return subscription


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription(
    subscription_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete subscription."""

    subscription = await _get_subscription_or_404(session, subscription_id, current_user.id)
    await session.delete(subscription)
    await record_audit_log(
        session,
        user_id=current_user.id,
        action=AuditAction.subscription_deleted,
        entity="subscription",
        entity_id=subscription.id,
    )
    await session.commit()


@router.post("/{subscription_id}/snooze", response_model=SubscriptionRead)
async def snooze_subscription(
    subscription_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    """Postpone next reminder by one day."""

    subscription = await _get_subscription_or_404(session, subscription_id, current_user.id)
    now = current_time()
    subscription.next_reminder_at = now + timedelta(days=1)
    await session.flush()
    await record_audit_log(
        session,
        user_id=current_user.id,
        action=AuditAction.subscription_snoozed,
        entity="subscription",
        entity_id=subscription.id,
    )
    await session.commit()
    await session.refresh(subscription)
    return subscription


@router.patch("/{subscription_id}/status", response_model=SubscriptionRead)
async def update_subscription_status(
    subscription_id: UUID,
    payload: SubscriptionStatusUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    """Update subscription status explicitly."""

    subscription = await _get_subscription_or_404(session, subscription_id, current_user.id)
    now = current_time()
    previous_status = subscription.status
    subscription.status = resolve_subscription_status(
        end_at=subscription.end_at,
        provided_status=payload.status,
        existing_status=previous_status,
        now=now,
    )
    subscription.next_reminder_at = calculate_next_reminder(
        end_at=subscription.end_at,
        status=subscription.status,
        last_notified_at=subscription.last_notified_at,
        now=now,
        user_timezone=current_user.tz,
    )
    await session.flush()
    await record_audit_log(
        session,
        user_id=current_user.id,
        action=AuditAction.subscription_status_changed,
        entity="subscription",
        entity_id=subscription.id,
        meta={"from": str(previous_status), "to": str(subscription.status)},
    )
    await session.commit()
    await session.refresh(subscription)
    return subscription
