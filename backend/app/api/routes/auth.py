"""Authentication endpoints."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Mapping
from urllib.parse import urlencode

import logging

import httpx

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.models.subscription import AuditAction
from app.models.user import Identity, OAuthProvider, OAuthState, User
from app.schemas.auth import (
    AuthCallbackResponse,
    AuthLoginResponse,
    EmailVerificationRequest,
    EmailVerificationResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    TokenPair,
)
from app.schemas.user import UserRead
from app.services.audit import record_audit_log
from app.services.auth import (
    create_user_session,
    get_user_by_refresh_token,
    rotate_session_tokens,
)
from app.services.email import EmailDeliveryError
from app.services.email_verification import (
    create_verification_token,
    send_verification_email,
    verify_token,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

PROVIDER_AUTH_ENDPOINTS: Mapping[OAuthProvider, str] = {
    OAuthProvider.google: "https://accounts.google.com/o/oauth2/v2/auth",
    OAuthProvider.github: "https://github.com/login/oauth/authorize",
    OAuthProvider.auth0: "https://auth0.com/authorize",
    OAuthProvider.okta: "https://okta.com/oauth2/v1/authorize",
}


def _current_time() -> datetime:
    return datetime.now(timezone.utc)


async def _exchange_google_code(*, code: str, redirect_uri: str) -> tuple[str, str, bool]:
    """Exchange Google authorization code for user identity."""

    if not settings.oauth_client_id or not settings.oauth_client_secret:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google OAuth client not configured")

    token_payload = {
        "client_id": settings.oauth_client_id,
        "client_secret": settings.oauth_client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        token_response = await client.post("https://oauth2.googleapis.com/token", data=token_payload)
        if token_response.status_code != status.HTTP_200_OK:
            logger.warning("Google token exchange failed: %s", token_response.text)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to exchange authorization code")
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google token response missing access token")

        userinfo_response = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_response.status_code != status.HTTP_200_OK:
            logger.warning("Google userinfo failed: %s", userinfo_response.text)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch user info")
        userinfo = userinfo_response.json()

    sub = userinfo.get("sub")
    email = userinfo.get("email")
    email_verified = bool(userinfo.get("email_verified", False))

    if not sub or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incomplete user info")

    return sub, email, email_verified


def _default_provider() -> OAuthProvider:
    if settings.oauth_provider:
        try:
            return OAuthProvider(settings.oauth_provider)
        except ValueError as exc:  # pragma: no cover - config error
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported provider") from exc
    return OAuthProvider.google


def _build_authorization_url(provider: OAuthProvider, redirect_uri: str, state: str) -> str:
    base_url = PROVIDER_AUTH_ENDPOINTS.get(provider, settings.frontend_url)
    query = urlencode(
        {
            "client_id": settings.oauth_client_id or "demo-client",
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        }
    )
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{query}"


@router.get("/login", response_model=AuthLoginResponse, summary="Initiate OAuth login")
async def login(
    redirect_uri: str = Query(..., description="OAuth redirect URI"),
    provider: OAuthProvider | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> AuthLoginResponse:
    """Create OAuth state and return authorization URL."""

    selected_provider = provider or _default_provider()
    state = secrets.token_urlsafe(32)
    expires_at = _current_time() + timedelta(minutes=10)
    oauth_state = OAuthState(
        provider=selected_provider,
        state=state,
        redirect_uri=redirect_uri,
        expires_at=expires_at,
    )
    session.add(oauth_state)
    await session.flush()
    await session.commit()

    authorization_url = _build_authorization_url(selected_provider, redirect_uri, state)
    return AuthLoginResponse(
        provider=selected_provider,
        authorization_url=authorization_url,
        state=state,
        expires_at=expires_at,
    )


@router.get("/callback", response_model=AuthCallbackResponse, summary="Handle OAuth callback")
async def auth_callback(
    state: str = Query(...),
    code: str = Query(...),
    email: str | None = Query(default=None),
    provider_user_id: str | None = Query(default=None, description="Unique user id from provider"),
    email_verified: bool | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> AuthCallbackResponse:
    """Exchange OAuth callback for tokens and profile."""

    result = await session.execute(select(OAuthState).where(OAuthState.state == state))
    oauth_state = result.scalar_one_or_none()
    if oauth_state is None or oauth_state.expires_at < _current_time():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired state")

    provider = oauth_state.provider

    if provider == OAuthProvider.google and (email is None or provider_user_id is None):
        try:
            provider_user_id, email, email_verified = await _exchange_google_code(
                code=code,
                redirect_uri=oauth_state.redirect_uri,
            )
        except HTTPException:
            raise
        except Exception as exc:  # pragma: no cover - network failures
            logger.exception("Failed to exchange Google OAuth code")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to exchange code") from exc

    if email is None or provider_user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing user identity")

    if email_verified is None:
        email_verified = True
    await session.execute(delete(OAuthState).where(OAuthState.id == oauth_state.id))

    identity_stmt = (
        select(Identity, User)
        .join(User, Identity.user_id == User.id)
        .where(Identity.provider == provider, Identity.provider_user_id == provider_user_id)
    )
    identity_result = await session.execute(identity_stmt)
    identity_row = identity_result.one_or_none()

    needs_email_verification = False
    verification_token = None

    if identity_row:
        identity, user = identity_row
        if email_verified and not user.email_verified:
            user.email_verified = True
        elif not email_verified and not user.email_verified:
            needs_email_verification = True
    else:
        user_result = await session.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()
        if user is None:
            user = User(email=email, email_verified=email_verified)
            session.add(user)
            await session.flush()
            needs_email_verification = not email_verified
        elif email_verified and not user.email_verified:
            user.email_verified = True
        elif not email_verified and not user.email_verified:
            needs_email_verification = True
        identity = Identity(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
        )
        session.add(identity)
        await session.flush()

    if needs_email_verification:
        verification_token = await create_verification_token(session, user)

    user_session = await create_user_session(session, user)
    await record_audit_log(
        session,
        user_id=user.id,
        action=AuditAction.login,
        entity="user",
        entity_id=user.id,
        meta={"provider": provider.value, "code": code},
    )
    await session.commit()

    if verification_token is not None:
        try:
            send_verification_email(user, verification_token)
        except EmailDeliveryError:
            logger.warning("Failed to send verification email to %s", user.email, exc_info=True)

    tokens = TokenPair(
        access_token=user_session.access_token,
        refresh_token=user_session.refresh_token,
        expires_in=settings.access_token_expires_minutes * 60,
        refresh_expires_in=settings.refresh_token_expires_minutes * 60,
    )
    return AuthCallbackResponse(user=UserRead.model_validate(user), tokens=tokens)


@router.post("/refresh", response_model=RefreshTokenResponse, summary="Refresh access token")
async def refresh_tokens(
    payload: RefreshTokenRequest,
    session: AsyncSession = Depends(get_db),
) -> RefreshTokenResponse:
    """Refresh tokens using a valid refresh token."""

    row = await get_user_by_refresh_token(session, payload.refresh_token)
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user, user_session = row
    await rotate_session_tokens(session, user_session)
    await session.commit()

    tokens = TokenPair(
        access_token=user_session.access_token,
        refresh_token=user_session.refresh_token,
        expires_in=settings.access_token_expires_minutes * 60,
        refresh_expires_in=settings.refresh_token_expires_minutes * 60,
    )
    return RefreshTokenResponse(tokens=tokens, user=UserRead.model_validate(user))


@router.post("/verify-email", response_model=EmailVerificationResponse, summary="Verify email address")
async def verify_email_address(
    payload: EmailVerificationRequest,
    session: AsyncSession = Depends(get_db),
) -> EmailVerificationResponse:
    """Confirm email via verification token."""

    try:
        user = await verify_token(session, payload.token)
    except ValueError as exc:  # pragma: no cover - validation path
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await session.commit()

    return EmailVerificationResponse(user=UserRead.model_validate(user))
