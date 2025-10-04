"""Simple SMTP email delivery helpers."""
from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage
from typing import Mapping

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailNotConfiguredError(RuntimeError):
    """Raised when SMTP configuration is missing."""


def _build_message(
    *, subject: str, recipients: list[str], text_body: str, html_body: str | None
) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.email_from or "Subscriptions <no-reply@example.com>"
    message["To"] = ", ".join(recipients)
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")
    return message


def _send_email_sync(message: EmailMessage) -> None:
    if not settings.smtp_host or not settings.smtp_port:
        raise EmailNotConfiguredError("SMTP connection is not configured")

    mail_kwargs: Mapping[str, object] = {
        "host": settings.smtp_host,
        "port": settings.smtp_port,
        "timeout": 10,
    }
    with smtplib.SMTP(**mail_kwargs) as smtp:
        smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)


async def send_email(
    *, subject: str, recipients: list[str], text_body: str, html_body: str | None = None
) -> None:
    """Send email via SMTP without blocking the event loop."""

    message = _build_message(
        subject=subject,
        recipients=recipients,
        text_body=text_body,
        html_body=html_body,
    )

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, _send_email_sync, message)
    except EmailNotConfiguredError:
        logger.warning("Skipping email send because SMTP is not configured")
    except smtplib.SMTPException as exc:  # pragma: no cover - defensive
        logger.error("Failed to send email: %s", exc, exc_info=True)
        raise
