"""Email verification helpers."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from urllib.parse import urlencode, urljoin

from app.core.config import settings
from app.models.user import EmailVerificationToken, User
from app.services.email import send_email

_VERIFICATION_TTL = timedelta(hours=24)


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_verification_token(session: AsyncSession, user: User) -> EmailVerificationToken:
    """Create or replace an email verification token for the user."""

    # Reuse valid token if present to avoid spamming.
    existing_stmt = select(EmailVerificationToken).where(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.used_at.is_(None),
        EmailVerificationToken.expires_at > _now(),
    )
    result = await session.execute(existing_stmt)
    existing = result.scalar_one_or_none()

    token_value = secrets.token_urlsafe(32)
    expires_at = _now() + _VERIFICATION_TTL

    if existing is not None:
        existing.token = token_value
        existing.expires_at = expires_at
        await session.flush()
        return existing

    verification = EmailVerificationToken(
        user_id=user.id,
        token=token_value,
        expires_at=expires_at,
    )
    session.add(verification)
    await session.flush()
    return verification


def send_verification_email(user: User, token: EmailVerificationToken) -> None:
    """Send verification email to user if SMTP configured."""

    frontend_base = settings.frontend_url.rstrip("/") + "/"
    verification_path = urljoin(frontend_base, "auth/verify-email")
    query = urlencode({"token": token.token})
    verification_link = f"{verification_path}?{query}"
    body = (
        "Здравствуйте!\n\n"
        "Подтвердите, пожалуйста, вашу почту, перейдя по ссылке:\n"
        f"{verification_link}\n\n"
        "Если вы не запрашивали вход, проигнорируйте это письмо."
    )
    send_email(
        to_address=user.email,
        subject="Подтвердите email для Subscriptions",
        text_body=body,
    )


async def verify_token(session: AsyncSession, token_value: str) -> User:
    """Mark verification token as used and return associated user."""

    stmt = select(EmailVerificationToken, User).join(User).where(
        EmailVerificationToken.token == token_value
    )
    result = await session.execute(stmt)
    row = result.one_or_none()
    if row is None:
        raise ValueError("Токен не найден")

    token, user = row
    now = _now()
    if token.used_at is not None:
        raise ValueError("Токен уже использован")
    if token.expires_at < now:
        raise ValueError("Токен истёк")

    token.used_at = now
    if not user.email_verified:
        user.email_verified = True
    await session.flush()
    return user
