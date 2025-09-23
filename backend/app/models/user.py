"""User related database models."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class OAuthProvider(enum.StrEnum):
    """Supported OAuth/OIDC providers."""

    google = "google"
    github = "github"
    auth0 = "auth0"
    okta = "okta"


oauth_provider_enum = Enum(OAuthProvider, name="oauth_provider", validate_strings=True)


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Application user."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tz: Mapped[str] = mapped_column(String(64), default="Europe/Moscow", nullable=False)
    locale: Mapped[str] = mapped_column(String(5), default="ru", nullable=False)

    identities: Mapped[list[Identity]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    telegram_accounts: Mapped[list[TelegramAccount]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[list[UserSession]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Identity(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """External OAuth provider identity."""

    __tablename__ = "identities"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_identities_provider_provider_user_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[OAuthProvider] = mapped_column(oauth_provider_enum)
    provider_user_id: Mapped[str] = mapped_column(String(255), nullable=False)

    user: Mapped[User] = relationship(back_populates="identities")


class TelegramAccount(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Linked Telegram account."""

    __tablename__ = "telegram_accounts"
    __table_args__ = (UniqueConstraint("telegram_chat_id", name="uq_telegram_accounts_telegram_chat_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    telegram_chat_id: Mapped[int] = mapped_column(nullable=False)
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped[User] = relationship(back_populates="telegram_accounts")


class UserSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Access and refresh token pair for user."""

    __tablename__ = "user_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    access_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    refresh_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    access_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    refresh_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship(back_populates="sessions")


class OAuthState(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """State token to validate OAuth flows."""

    __tablename__ = "oauth_states"

    provider: Mapped[OAuthProvider] = mapped_column(oauth_provider_enum)
    state: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    redirect_uri: Mapped[str] = mapped_column(String(1024), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class TelegramLinkToken(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One-time token for linking Telegram account."""

    __tablename__ = "telegram_link_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship()
