"""Authentication endpoints implementing OAuth2/OIDC login."""
from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Mapping, TypedDict
from urllib.parse import urlencode

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
from app.services.email import send_email

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class ProviderConfig(TypedDict, total=False):
    authorize_url: str
    token_url: str
    userinfo_url: str
    scopes: list[str]
    extra_auth_params: Mapping[str, str]


DEFAULT_PROVIDER_CONFIG: Mapping[OAuthProvider, ProviderConfig] = {
    OAuthProvider.google: {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
        "scopes": ["openid", "email", "profile"],
        "extra_auth_params": {"access_type": "offline", "prompt": "consent"},
    },
    OAuthProvider.github: {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scopes": ["read:user", "user:email"],
    },
    OAuthProvider.auth0: {},
    OAuthProvider.okta: {},
}


PLACEHOLDER_CLIENT_IDS = {"demo-client", "your-client-id", "your_client_id"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _resolve_provider(provider: OAuthProvider | None) -> OAuthProvider:
    if provider is not None:
        return provider
    if settings.oauth_provider:
        try:
            return OAuthProvider(settings.oauth_provider)
        except ValueError as exc:  # pragma: no cover - config error
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported provider") from exc
    return OAuthProvider.google


def _provider_config(provider: OAuthProvider) -> ProviderConfig:
    base_config = DEFAULT_PROVIDER_CONFIG.get(provider, {}).copy()
    if settings.oauth_authorize_url:
        base_config["authorize_url"] = settings.oauth_authorize_url
    if settings.oauth_token_url:
        base_config["token_url"] = settings.oauth_token_url
    if settings.oauth_userinfo_url:
        base_config["userinfo_url"] = settings.oauth_userinfo_url
    base_config.setdefault("scopes", ["openid", "email", "profile"])
    base_config.setdefault("extra_auth_params", {})
    missing = [
        key
        for key in ("authorize_url", "token_url", "userinfo_url")
        if key not in base_config or not base_config[key]
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Provider configuration missing values: {', '.join(missing)}",
        )
    return base_config


def _provider_credentials(provider: OAuthProvider) -> tuple[str, str | None]:
    client_id: str | None
    client_secret: str | None

    if provider is OAuthProvider.google:
        client_id = settings.oauth_google_client_id or settings.oauth_client_id
        client_secret = settings.oauth_google_client_secret or settings.oauth_client_secret
    elif provider is OAuthProvider.github:
        client_id = settings.oauth_github_client_id or settings.oauth_client_id
        client_secret = settings.oauth_github_client_secret or settings.oauth_client_secret
    else:
        client_id = settings.oauth_client_id
        client_secret = settings.oauth_client_secret

    if not client_id or client_id in PLACEHOLDER_CLIENT_IDS:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "OAuth client id is not configured for the selected provider. "
                "Set OAUTH_CLIENT_ID or a provider-specific override."
            ),
        )

    return client_id, client_secret


def _create_pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("utf-8")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")
    return verifier, challenge


async def _exchange_code_for_tokens(
    *,
    provider: OAuthProvider,
    code: str,
    config: ProviderConfig,
    redirect_uri: str,
    code_verifier: str | None,
) -> dict[str, Any]:
    client_id, client_secret = _provider_credentials(provider)

    data: dict[str, Any] = {
        "client_id": client_id,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    if client_secret:
        data["client_secret"] = client_secret
    if code_verifier:
        data["code_verifier"] = code_verifier

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(config["token_url"], data=data, headers={"Accept": "application/json"})
    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to exchange authorization code")
    token_payload = response.json()
    if "access_token" not in token_payload:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Token endpoint response incomplete")
    return token_payload


async def _fetch_userinfo(config: ProviderConfig, access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            config["userinfo_url"],
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch user profile")
    return response.json()


async def _enqueue_verification_email(user: User) -> None:
    token = secrets.token_urlsafe(32)
    user.email_verification_token = token
    user.email_verification_sent_at = _now()
    verify_link = f"{settings.base_url.rstrip('/')}/api/v1/auth/verify?token={token}"
    subject = "Verify your email address"
    text_body = (
        "Hi!\n\n"
        "We need to confirm your email before enabling subscription reminders. "
        f"Click the link below to finish verification:\n{verify_link}\n\n"
        "If you did not request this, you can ignore the message."
    )
    html_body = (
        "<p>Hi!</p>"
        "<p>To unlock subscription reminders please confirm your email.</p>"
        f"<p><a href=\"{verify_link}\">Verify email</a></p>"
        "<p>If you did not initiate this request you can safely ignore the message.</p>"
    )
    await send_email(subject=subject, recipients=[user.email], text_body=text_body, html_body=html_body)


def _email_verified_from_profile(profile: Mapping[str, Any]) -> bool:
    if "email_verified" in profile:
        return bool(profile["email_verified"])
    if "verified_email" in profile:
        return bool(profile["verified_email"])
    return False


def _extract_provider_user_id(profile: Mapping[str, Any]) -> str:
    for key in ("sub", "id", "user_id"):
        value = profile.get(key)
        if value:
            return str(value)
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="OAuth provider response missing user id")


async def _resolve_user_email(
    provider: OAuthProvider,
    profile: Mapping[str, Any],
    access_token: str,
) -> tuple[str | None, bool]:
    email = profile.get("email")
    if email:
        return str(email), _email_verified_from_profile(profile)

    if provider is OAuthProvider.github:
        fallback = await _fetch_github_primary_email(access_token)
        if fallback:
            return fallback

    return None, False


async def _fetch_github_primary_email(access_token: str) -> tuple[str, bool] | None:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch GitHub email addresses")

    payload = response.json()
    if not isinstance(payload, list):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unexpected GitHub email payload")

    def select_email(predicate: Callable[[Mapping[str, Any]], bool]) -> tuple[str, bool] | None:
        for item in payload:
            if not isinstance(item, Mapping):
                continue
            if not predicate(item):
                continue
            address = item.get("email")
            if address:
                return str(address), bool(item.get("verified", False))
        return None

    for chooser in (
        lambda item: bool(item.get("primary")) and bool(item.get("verified")),
        lambda item: bool(item.get("verified")),
        lambda item: True,
    ):
        result = select_email(chooser)
        if result:
            return result

    return None


@router.get("/login", response_model=AuthLoginResponse, summary="Initiate OAuth login")
async def login(
    redirect_uri: str | None = Query(None, description="OAuth redirect URI"),
    provider: OAuthProvider | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> AuthLoginResponse:
    """Create OAuth state, PKCE parameters and return authorization URL."""

    selected_provider = _resolve_provider(provider)
    config = _provider_config(selected_provider)

    effective_redirect = redirect_uri or settings.oauth_redirect_uri
    if not effective_redirect:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="redirect_uri is required")

    client_id, _ = _provider_credentials(selected_provider)

    verifier, challenge = _create_pkce_pair()
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(16)
    expires_at = _now() + timedelta(minutes=10)

    oauth_state = OAuthState(
        provider=selected_provider,
        state=state,
        redirect_uri=effective_redirect,
        code_verifier=verifier,
        nonce=nonce,
        expires_at=expires_at,
    )
    session.add(oauth_state)
    await session.flush()
    await session.commit()

    auth_params = {
        "client_id": client_id,
        "redirect_uri": effective_redirect,
        "response_type": "code",
        "scope": " ".join(config["scopes"]),
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "nonce": nonce,
    }
    auth_params.update(config.get("extra_auth_params", {}))
    query = urlencode(auth_params)
    separator = "&" if "?" in config["authorize_url"] else "?"
    authorization_url = f"{config['authorize_url']}{separator}{query}"

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
    session: AsyncSession = Depends(get_db),
) -> AuthCallbackResponse:
    """Handle OAuth redirect, exchange code, and sign user in."""

    record_stmt = select(OAuthState).where(OAuthState.state == state)
    oauth_state = (await session.execute(record_stmt)).scalar_one_or_none()
    if oauth_state is None or oauth_state.expires_at < _now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired state")

    provider = oauth_state.provider
    config = _provider_config(provider)

    token_payload = await _exchange_code_for_tokens(
        provider=provider,
        code=code,
        config=config,
        redirect_uri=oauth_state.redirect_uri,
        code_verifier=oauth_state.code_verifier,
    )
    profile = await _fetch_userinfo(config, token_payload["access_token"])

    email, email_verified = await _resolve_user_email(provider, profile, token_payload["access_token"])
    if not email:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="OAuth provider response missing email")

    provider_user_id = _extract_provider_user_id(profile)

    await session.execute(delete(OAuthState).where(OAuthState.id == oauth_state.id))

    identity_stmt = (
        select(Identity, User)
        .join(User, Identity.user_id == User.id)
        .where(Identity.provider == provider, Identity.provider_user_id == provider_user_id)
    )
    identity_row = (await session.execute(identity_stmt)).one_or_none()

    if identity_row:
        identity, user = identity_row
    else:
        user_result = await session.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()
        if user is None:
            user = User(email=email, email_verified=email_verified)
            session.add(user)
            await session.flush()
        elif email_verified and not user.email_verified:
            user.email_verified = True
            user.email_verification_token = None
            user.email_verification_sent_at = None
        identity = Identity(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
        )
        session.add(identity)
        await session.flush()

    pending_verification = False
    tokens: TokenPair | None = None

    if user.email_verified or email_verified:
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        (
            access_token,
            access_exp,
            refresh_token,
            refresh_exp,
            _,
        ) = await create_user_session(session, user)
        tokens = TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=int((access_exp - _now()).total_seconds()),
            refresh_expires_in=int((refresh_exp - _now()).total_seconds()),
        )
    else:
        pending_verification = True
        await session.flush()
        await _enqueue_verification_email(user)

    await record_audit_log(
        session,
        user_id=user.id,
        action=AuditAction.login,
        entity="user",
        entity_id=user.id,
        meta={"provider": provider.value, "state": state},
    )
    await session.commit()

    return AuthCallbackResponse(
        user=UserRead.model_validate(user),
        tokens=tokens,
        pending_verification=pending_verification,
    )


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

    (
        access_token,
        access_exp,
        refresh_token,
        refresh_exp,
        _,
    ) = await rotate_session_tokens(session, user_session, user)
    await session.commit()

    tokens = TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int((access_exp - _now()).total_seconds()),
        refresh_expires_in=int((refresh_exp - _now()).total_seconds()),
    )
    return RefreshTokenResponse(tokens=tokens, user=UserRead.model_validate(user))


@router.get("/verify", response_model=EmailVerificationResponse, summary="Verify email address")
async def verify_email(
    token: str = Query(..., description="Verification token received by email"),
    session: AsyncSession = Depends(get_db),
) -> EmailVerificationResponse:
    """Confirm user email and enable access."""

    stmt = select(User).where(User.email_verification_token == token)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    if user.email_verification_sent_at and user.email_verification_sent_at + timedelta(hours=settings.email_verification_hours) < _now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token expired")

    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_sent_at = None
    await session.commit()

    return EmailVerificationResponse(verified=True)
