"""JWT utilities and security helpers."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, TypedDict

from jose import JWTError, jwt

from app.core.config import settings


class TokenDecodeError(Exception):
    """Raised when token decoding fails."""


class TokenPayload(TypedDict, total=False):
    """JWT payload contract used across the service."""

    sub: str
    email: str
    email_verified: bool
    exp: int
    iat: int
    jti: str
    token_type: str


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _create_token(data: dict[str, Any], expires_delta: timedelta) -> tuple[str, datetime]:
    payload: TokenPayload = TokenPayload(**data)
    now = _now()
    payload.setdefault("iat", int(now.timestamp()))
    payload.setdefault("jti", secrets.token_urlsafe(8))
    payload["exp"] = int((now + expires_delta).timestamp())
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, datetime.fromtimestamp(payload["exp"], tz=timezone.utc)


def create_access_token(*, user_id: str, email: str, email_verified: bool) -> tuple[str, datetime]:
    """Return signed access token and its expiry moment."""

    token_data: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "email_verified": email_verified,
        "token_type": "access",
    }
    ttl = timedelta(minutes=settings.access_token_expires_minutes)
    return _create_token(token_data, ttl)


def create_refresh_token(*, user_id: str) -> tuple[str, datetime]:
    """Return signed refresh token and expiry timestamp."""

    token_data: dict[str, Any] = {
        "sub": user_id,
        "token_type": "refresh",
    }
    ttl = timedelta(minutes=settings.refresh_token_expires_minutes)
    return _create_token(token_data, ttl)


def decode_token(token: str, *, expected_type: str | None = None) -> TokenPayload:
    """Decode JWT and optionally assert token type."""

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:  # pragma: no cover - defensive
        raise TokenDecodeError("Invalid token") from exc

    token_type = payload.get("token_type")
    if expected_type and token_type != expected_type:
        raise TokenDecodeError("Unexpected token type")
    return TokenPayload(**payload)
