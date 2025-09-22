"""Authentication schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import OAuthProvider
from app.schemas.user import UserRead


class TokenPair(BaseModel):
    """Access and refresh tokens issued to client."""

    access_token: str
    refresh_token: str
    token_type: str = Field(default="bearer", pattern="^bearer$")
    expires_in: int
    refresh_expires_in: int


class AuthLoginResponse(BaseModel):
    """Login initiation payload."""

    provider: OAuthProvider
    authorization_url: str
    state: str
    expires_at: datetime


class AuthCallbackResponse(BaseModel):
    """Response returned after successful OAuth callback processing."""

    user: UserRead
    tokens: TokenPair


class RefreshTokenRequest(BaseModel):
    """Request payload for refreshing tokens."""

    refresh_token: str


class RefreshTokenResponse(BaseModel):
    """Response payload with renewed tokens."""

    tokens: TokenPair
    user: UserRead

    model_config = ConfigDict(from_attributes=True)
