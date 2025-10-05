"""Email delivery helpers."""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    """Raised when email cannot be delivered."""


def _build_client() -> smtplib.SMTP | None:
    if not settings.smtp_host or not settings.smtp_port:
        logger.warning("SMTP settings are missing; email will not be sent.")
        return None
    client = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
    if settings.smtp_user and settings.smtp_password:
        client.starttls()
        client.login(settings.smtp_user, settings.smtp_password)
    return client


def send_email(*, to_address: str, subject: str, text_body: str) -> None:
    """Send a plain text email if SMTP is configured."""

    if not settings.email_from:
        logger.warning("EMAIL_FROM is not configured; skipping email send.")
        return

    client = _build_client()
    if client is None:
        return

    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(text_body)

    try:
        client.send_message(message)
        logger.info("Verification email sent to %s", to_address)
    except Exception as exc:  # pragma: no cover - network errors
        logger.exception("Failed to send email message")
        raise EmailDeliveryError("Failed to send email") from exc
    finally:
        try:
            client.quit()
        except Exception:  # pragma: no cover - cleanup best-effort
            logger.debug("Failed to close SMTP connection", exc_info=True)
