"""Utilities for issuing and validating JWT tokens."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings


class TokenType:
    """Supported token types."""

    access = "access"
    refresh = "refresh"


class TokenValidationError(RuntimeError):
    """Raised when token validation fails."""


def _now() -> datetime:
    """Return current UTC time."""

    return datetime.now(timezone.utc)


def _build_payload(
    *,
    subject: uuid.UUID,
    session_id: uuid.UUID,
    token_type: str,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> dict[str, Any]:
    issued_at = _now()
    expires_at = issued_at + expires_delta
    payload: dict[str, Any] = {
        "sub": str(subject),
        "sid": str(session_id),
        "type": token_type,
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return payload


def create_access_token(*, subject: uuid.UUID, session_id: uuid.UUID) -> tuple[str, datetime]:
    """Return encoded access token and its expiration time."""

    expires_delta = timedelta(minutes=settings.access_token_expires_minutes)
    payload = _build_payload(
        subject=subject,
        session_id=session_id,
        token_type=TokenType.access,
        expires_delta=expires_delta,
    )
    encoded = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    return encoded, expires_at


def create_refresh_token(*, subject: uuid.UUID, session_id: uuid.UUID) -> tuple[str, datetime]:
    """Return encoded refresh token and its expiration time."""

    expires_delta = timedelta(minutes=settings.refresh_token_expires_minutes)
    payload = _build_payload(
        subject=subject,
        session_id=session_id,
        token_type=TokenType.refresh,
        expires_delta=expires_delta,
    )
    encoded = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    return encoded, expires_at


def decode_token(token: str, *, expected_type: str | None = None) -> dict[str, Any]:
    """Decode JWT token and optionally validate its type."""

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:  # pragma: no cover - jose already tested
        raise TokenValidationError("Invalid token") from exc

    token_type = payload.get("type")
    if expected_type is not None and token_type != expected_type:
        raise TokenValidationError("Unexpected token type")

    return payload
