"""Pydantic schemas for API payloads."""
from app.schemas.auth import (
    AuthCallbackResponse,
    AuthLoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    TokenPair,
)
from app.schemas.notification import NotificationTestRequest, NotificationTestResponse
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionRead,
    SubscriptionStatusUpdate,
    SubscriptionUpdate,
)
from app.schemas.telegram import (
    TelegramLinkCompleteRequest,
    TelegramLinkCompleteResponse,
    TelegramLinkTokenResponse,
)
from app.schemas.user import UserRead

__all__ = [
    "AuthCallbackResponse",
    "AuthLoginResponse",
    "NotificationTestRequest",
    "NotificationTestResponse",
    "RefreshTokenRequest",
    "RefreshTokenResponse",
    "SubscriptionCreate",
    "SubscriptionRead",
    "SubscriptionStatusUpdate",
    "SubscriptionUpdate",
    "TelegramLinkCompleteRequest",
    "TelegramLinkCompleteResponse",
    "TelegramLinkTokenResponse",
    "TokenPair",
    "UserRead",
]
