"""Notification endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.subscription import AuditAction, Notification, NotificationChannel, NotificationStatus
from app.models.user import User
from app.schemas.notification import NotificationTestRequest, NotificationTestResponse
from app.services.audit import record_audit_log
from app.services.subscriptions import current_time

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.post("/test", response_model=NotificationTestResponse, summary="Create test notification")
async def create_test_notification(
    payload: NotificationTestRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Notification:
    """Persist a test notification entry for the current user."""

    if payload.channel == NotificationChannel.email and not payload.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email address is required")
    if payload.channel == NotificationChannel.telegram and payload.telegram_chat_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram chat id is required")

    notification = Notification(
        subscription_id=payload.subscription_id,
        channel=payload.channel,
        status=NotificationStatus.sent,
        sent_at=current_time(),
    )
    session.add(notification)
    await session.flush()

    await record_audit_log(
        session,
        user_id=current_user.id,
        action=AuditAction.notification_test,
        entity="notification",
        entity_id=notification.id,
        meta={"channel": str(payload.channel), "message": payload.message},
    )

    await session.commit()
    await session.refresh(notification)
    return notification
